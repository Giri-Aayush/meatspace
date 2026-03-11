// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title TaskEscrow
/// @notice Escrow contract for AI-agent-to-human task marketplace on Celo.
/// Payment in USDC (Celo Sepolia). Released only after full 3-layer proof chain is verified.
contract TaskEscrow {
    IERC20 public immutable cUSD;
    address public platformWallet;
    uint256 public constant PLATFORM_FEE_BPS = 500; // 5%

    enum TaskState {
        CREATED,
        ACCEPTED,
        PICKUP_VERIFIED,
        IN_TRANSIT,
        DELIVERED,
        COMPLETED,
        DISPUTED
    }

    struct Task {
        uint256 id;
        address agent;
        address worker;
        uint256 amount; // 18-decimal cUSD
        bytes32 otpHash; // keccak256(abi.encodePacked(otp))
        string pickupCid; // IPFS CID of pickup proof bundle
        TaskState state;
        bool pickupVerified;
        bool gpsVerified;
        uint256 deadline; // unix timestamp
        uint256 acceptedAt; // for 2-hour auto-release window
    }

    uint256 public nextTaskId;
    mapping(uint256 => Task) public tasks;

    event TaskCreated(uint256 indexed taskId, address indexed agent, uint256 amount);
    event TaskAccepted(uint256 indexed taskId, address indexed worker);
    event PickupProofSubmitted(uint256 indexed taskId, string cid);
    event DeliveryGPSVerified(uint256 indexed taskId);
    event TaskCompleted(uint256 indexed taskId, address worker, uint256 payout);
    event TaskDisputed(uint256 indexed taskId);
    event TaskAutoReleased(uint256 indexed taskId);

    constructor(address _cUSD, address _platformWallet) {
        cUSD = IERC20(_cUSD);
        platformWallet = _platformWallet;
    }

    /// @notice Agent calls this after approving cUSD transfer. Locks funds in escrow.
    function createTask(
        bytes32 _otpHash,
        uint256 _amount,
        uint256 _deadline
    ) external returns (uint256 taskId) {
        require(_amount > 0, "Amount must be > 0");
        require(_deadline > block.timestamp, "Deadline must be in future");

        cUSD.transferFrom(msg.sender, address(this), _amount);

        taskId = nextTaskId++;
        tasks[taskId] = Task({
            id: taskId,
            agent: msg.sender,
            worker: address(0),
            amount: _amount,
            otpHash: _otpHash,
            pickupCid: "",
            state: TaskState.CREATED,
            pickupVerified: false,
            gpsVerified: false,
            deadline: _deadline,
            acceptedAt: 0
        });

        emit TaskCreated(taskId, msg.sender, _amount);
    }

    /// @notice Verified worker accepts an open task.
    function acceptTask(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.state == TaskState.CREATED, "Task not available");
        require(t.agent != address(0), "Task does not exist");

        t.worker = msg.sender;
        t.state = TaskState.ACCEPTED;
        t.acceptedAt = block.timestamp;

        emit TaskAccepted(taskId, msg.sender);
    }

    /// @notice Backend calls after haversine check + IPFS upload succeed.
    function submitPickupProof(uint256 taskId, string calldata ipfsCid) external {
        Task storage t = tasks[taskId];
        require(t.worker == msg.sender, "Not your task");
        require(t.state == TaskState.ACCEPTED, "Wrong state");

        t.pickupCid = ipfsCid;
        t.pickupVerified = true;
        t.state = TaskState.PICKUP_VERIFIED;

        emit PickupProofSubmitted(taskId, ipfsCid);
    }

    /// @notice Backend calls after haversine check at destination succeeds.
    function submitDeliveryGPS(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.worker == msg.sender, "Not your task");
        require(
            t.state == TaskState.PICKUP_VERIFIED || t.state == TaskState.IN_TRANSIT,
            "Wrong state"
        );

        t.gpsVerified = true;
        t.state = TaskState.DELIVERED;

        emit DeliveryGPSVerified(taskId);
    }

    /// @notice Worker submits OTP received from recipient. Releases payment if valid.
    function confirmDelivery(uint256 taskId, string calldata otp) external {
        Task storage t = tasks[taskId];
        require(t.worker == msg.sender, "Not your task");
        require(t.state == TaskState.DELIVERED, "GPS not verified yet");
        require(t.pickupVerified, "Pickup not verified");
        require(t.gpsVerified, "GPS not verified");
        require(
            keccak256(abi.encodePacked(otp)) == t.otpHash,
            "Invalid OTP"
        );

        _releasePayout(taskId);
    }

    /// @notice Either party can flag a dispute — freezes escrow for manual review.
    function flagDispute(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(
            msg.sender == t.agent || msg.sender == t.worker,
            "Not a party to this task"
        );
        require(
            t.state != TaskState.COMPLETED && t.state != TaskState.DISPUTED,
            "Already finalized"
        );

        t.state = TaskState.DISPUTED;
        emit TaskDisputed(taskId);
    }

    /// @notice Auto-release after 2-hour window if recipient unreachable.
    /// Requires pickup and GPS verified (door photo fallback case).
    function autoRelease(uint256 taskId) external {
        Task storage t = tasks[taskId];
        require(t.state == TaskState.DELIVERED, "Not in DELIVERED state");
        require(t.pickupVerified && t.gpsVerified, "Proof chain incomplete");
        require(block.timestamp >= t.acceptedAt + 2 hours, "Auto-release window not reached");

        _releasePayout(taskId);
        emit TaskAutoReleased(taskId);
    }

    function _releasePayout(uint256 taskId) internal {
        Task storage t = tasks[taskId];
        t.state = TaskState.COMPLETED;

        uint256 fee = (t.amount * PLATFORM_FEE_BPS) / 10000;
        uint256 payout = t.amount - fee;

        cUSD.transfer(t.worker, payout);
        cUSD.transfer(platformWallet, fee);

        emit TaskCompleted(taskId, t.worker, payout);
    }
}
