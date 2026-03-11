// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "forge-std/Test.sol";
import "../contracts/TaskEscrow.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @dev Minimal ERC20 mock for cUSD
contract MockCUSD is ERC20 {
    constructor() ERC20("Celo Dollar", "cUSD") {}

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract TaskEscrowTest is Test {
    TaskEscrow public escrow;
    MockCUSD public cUSD;

    address agent = address(0xA1);
    address worker = address(0xB2);
    address platform = address(0xC3);
    address outsider = address(0xD4);

    uint256 constant AMOUNT = 5 ether; // 5 cUSD (18 decimals)
    uint256 deadline;
    string constant OTP = "123456";
    bytes32 otpHash;

    function setUp() public {
        cUSD = new MockCUSD();
        escrow = new TaskEscrow(address(cUSD), platform);

        // Fund agent
        cUSD.mint(agent, 100 ether);
        vm.prank(agent);
        cUSD.approve(address(escrow), type(uint256).max);

        deadline = block.timestamp + 1 days;
        otpHash = keccak256(abi.encodePacked(OTP));
    }

    // ─── createTask ────────────────────────────────────────────────────────────

    function test_createTask_locksEscrow() public {
        vm.prank(agent);
        uint256 taskId = escrow.createTask(otpHash, AMOUNT, deadline);

        assertEq(taskId, 0);
        assertEq(cUSD.balanceOf(address(escrow)), AMOUNT);

        (,, address w, uint256 amt,,, TaskEscrow.TaskState state,,,, ) = _getTask(taskId);
        assertEq(w, address(0));
        assertEq(amt, AMOUNT);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.CREATED));
    }

    function test_createTask_revertsZeroAmount() public {
        vm.prank(agent);
        vm.expectRevert("Amount must be > 0");
        escrow.createTask(otpHash, 0, deadline);
    }

    function test_createTask_reverts_pastDeadline() public {
        vm.prank(agent);
        vm.expectRevert("Deadline must be in future");
        escrow.createTask(otpHash, AMOUNT, block.timestamp - 1);
    }

    // ─── acceptTask ────────────────────────────────────────────────────────────

    function test_acceptTask_stateTransition() public {
        uint256 id = _createTask();

        vm.prank(worker);
        escrow.acceptTask(id);

        (,,address w,,,,TaskEscrow.TaskState state,,,,uint256 acceptedAt) = _getTask(id);
        assertEq(w, worker);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.ACCEPTED));
        assertEq(acceptedAt, block.timestamp);
    }

    function test_acceptTask_revertsDoubleAccept() public {
        uint256 id = _createTask();
        vm.prank(worker);
        escrow.acceptTask(id);

        vm.prank(outsider);
        vm.expectRevert("Task not available");
        escrow.acceptTask(id);
    }

    // ─── submitPickupProof ─────────────────────────────────────────────────────

    function test_submitPickupProof_stateTransition() public {
        uint256 id = _createAndAccept();

        vm.prank(worker);
        escrow.submitPickupProof(id, "bafkreitest");

        (,,,,,string memory cid, TaskEscrow.TaskState state, bool pickupVerified,,, ) = _getTask(id);
        assertEq(cid, "bafkreitest");
        assertTrue(pickupVerified);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.PICKUP_VERIFIED));
    }

    function test_submitPickupProof_revertsWrongCaller() public {
        uint256 id = _createAndAccept();
        vm.prank(outsider);
        vm.expectRevert("Not your task");
        escrow.submitPickupProof(id, "bafkreitest");
    }

    // ─── submitDeliveryGPS ─────────────────────────────────────────────────────

    function test_submitDeliveryGPS_stateTransition() public {
        uint256 id = _createPickupVerified();

        vm.prank(worker);
        escrow.submitDeliveryGPS(id);

        (,,,,,,TaskEscrow.TaskState state,, bool gpsVerified,,) = _getTask(id);
        assertTrue(gpsVerified);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.DELIVERED));
    }

    // ─── confirmDelivery ───────────────────────────────────────────────────────

    function test_confirmDelivery_correctOTP_releasesPayout() public {
        uint256 id = _createDelivered();

        uint256 workerBalBefore = cUSD.balanceOf(worker);
        uint256 platformBalBefore = cUSD.balanceOf(platform);

        vm.prank(worker);
        escrow.confirmDelivery(id, OTP);

        uint256 expectedFee = (AMOUNT * 500) / 10000; // 5%
        uint256 expectedPayout = AMOUNT - expectedFee;

        assertEq(cUSD.balanceOf(worker), workerBalBefore + expectedPayout);
        assertEq(cUSD.balanceOf(platform), platformBalBefore + expectedFee);
        assertEq(cUSD.balanceOf(address(escrow)), 0);

        (,,,,,,TaskEscrow.TaskState state,,,,) = _getTask(id);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.COMPLETED));
    }

    function test_confirmDelivery_wrongOTP_reverts() public {
        uint256 id = _createDelivered();

        vm.prank(worker);
        vm.expectRevert("Invalid OTP");
        escrow.confirmDelivery(id, "999999");
    }

    // ─── OTP hash parity with JS ───────────────────────────────────────────────

    /// @dev Verifies the hash matches what ethers.keccak256(ethers.toUtf8Bytes(otp)) produces.
    /// Confirmed: node -e "const {ethers}=require('ethers'); console.log(ethers.keccak256(ethers.toUtf8Bytes('123456')))"
    /// → 0xc888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a
    function test_otpHash_matchesJSKeccak256() public pure {
        bytes32 expected = 0xc888c9ce9e098d5864d3ded6ebcc140a12142263bace3a23a36f9905f12bd64a;
        bytes32 actual = keccak256(abi.encodePacked("123456"));
        assertEq(actual, expected);
    }

    // ─── flagDispute ───────────────────────────────────────────────────────────

    function test_flagDispute_byAgent() public {
        uint256 id = _createAndAccept();

        vm.prank(agent);
        escrow.flagDispute(id);

        (,,,,,,TaskEscrow.TaskState state,,,,) = _getTask(id);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.DISPUTED));
    }

    function test_flagDispute_byWorker() public {
        uint256 id = _createAndAccept();

        vm.prank(worker);
        escrow.flagDispute(id);

        (,,,,,,TaskEscrow.TaskState state,,,,) = _getTask(id);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.DISPUTED));
    }

    function test_flagDispute_revertsOutsider() public {
        uint256 id = _createAndAccept();

        vm.prank(outsider);
        vm.expectRevert("Not a party to this task");
        escrow.flagDispute(id);
    }

    // ─── autoRelease ───────────────────────────────────────────────────────────

    function test_autoRelease_after2Hours() public {
        uint256 id = _createDelivered();

        // Warp forward 2 hours + 1 second
        vm.warp(block.timestamp + 2 hours + 1);

        uint256 workerBalBefore = cUSD.balanceOf(worker);

        vm.prank(outsider); // anyone can trigger it
        escrow.autoRelease(id);

        assertGt(cUSD.balanceOf(worker), workerBalBefore);

        (,,,,,,TaskEscrow.TaskState state,,,,) = _getTask(id);
        assertEq(uint8(state), uint8(TaskEscrow.TaskState.COMPLETED));
    }

    function test_autoRelease_revertsBeforeWindow() public {
        uint256 id = _createDelivered();

        vm.prank(outsider);
        vm.expectRevert("Auto-release window not reached");
        escrow.autoRelease(id);
    }

    // ─── Helpers ───────────────────────────────────────────────────────────────

    function _createTask() internal returns (uint256) {
        vm.prank(agent);
        return escrow.createTask(otpHash, AMOUNT, deadline);
    }

    function _createAndAccept() internal returns (uint256) {
        uint256 id = _createTask();
        vm.prank(worker);
        escrow.acceptTask(id);
        return id;
    }

    function _createPickupVerified() internal returns (uint256) {
        uint256 id = _createAndAccept();
        vm.prank(worker);
        escrow.submitPickupProof(id, "bafkreitest");
        return id;
    }

    function _createDelivered() internal returns (uint256) {
        uint256 id = _createPickupVerified();
        vm.prank(worker);
        escrow.submitDeliveryGPS(id);
        return id;
    }

    function _getTask(uint256 id)
        internal
        view
        returns (
            uint256, address, address, uint256, bytes32,
            string memory, TaskEscrow.TaskState, bool, bool, uint256, uint256
        )
    {
        return escrow.tasks(id);
    }
}
