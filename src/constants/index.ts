// ─── Demo amounts (small — testnet faucet is limited) ────────────────────────
// 0.1 USDC = 100000 (6 decimals)
export const DEMO_TASK_AMOUNT_USDC = "0.1";
export const DEMO_TASK_AMOUNT_WEI = 100000n; // 0.1 USDC in 6-decimal units

// ─── Network ──────────────────────────────────────────────────────────────────
export const CELO_SEPOLIA_CHAIN_ID = 11142220;
export const CELO_SEPOLIA_RPC = "https://11142220.rpc.thirdweb.com";
export const CELO_SEPOLIA_EXPLORER = "https://celo-sepolia.blockscout.com";

// ─── Contract Addresses ───────────────────────────────────────────────────────
export const TASK_ESCROW_ADDRESS =
  process.env.NEXT_PUBLIC_TASK_ESCROW_ADDRESS ??
  "0xc361290c3A84b9F3F2C44683D908Ca5172EB9031";

export const USDC_ADDRESS =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ??
  "0x01C5C0122039549AD1493B8220cABEdD739BC44E";

// ─── USDC ABI (minimal — only what we need) ───────────────────────────────────
export const USDC_ABI = [
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)",
  "function balanceOf(address account) view returns (uint256)",
  "function transfer(address to, uint256 amount) returns (bool)",
  "function transferFrom(address from, address to, uint256 amount) returns (bool)",
] as const;

// ─── TaskEscrow ABI ───────────────────────────────────────────────────────────
export const TASK_ESCROW_ABI = [
  {
    "type": "constructor",
    "inputs": [
      { "name": "_cUSD", "type": "address", "internalType": "address" },
      { "name": "_platformWallet", "type": "address", "internalType": "address" }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "PLATFORM_FEE_BPS",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "acceptTask",
    "inputs": [{ "name": "taskId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "autoRelease",
    "inputs": [{ "name": "taskId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "cUSD",
    "inputs": [], "outputs": [{ "name": "", "type": "address", "internalType": "contract IERC20" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "confirmDelivery",
    "inputs": [
      { "name": "taskId", "type": "uint256", "internalType": "uint256" },
      { "name": "otp", "type": "string", "internalType": "string" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "createTask",
    "inputs": [
      { "name": "_otpHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "_amount", "type": "uint256", "internalType": "uint256" },
      { "name": "_deadline", "type": "uint256", "internalType": "uint256" }
    ],
    "outputs": [{ "name": "taskId", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "flagDispute",
    "inputs": [{ "name": "taskId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "nextTaskId",
    "inputs": [], "outputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "platformWallet",
    "inputs": [], "outputs": [{ "name": "", "type": "address", "internalType": "address" }],
    "stateMutability": "view"
  },
  {
    "type": "function", "name": "submitDeliveryGPS",
    "inputs": [{ "name": "taskId", "type": "uint256", "internalType": "uint256" }],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "submitPickupProof",
    "inputs": [
      { "name": "taskId", "type": "uint256", "internalType": "uint256" },
      { "name": "ipfsCid", "type": "string", "internalType": "string" }
    ],
    "outputs": [], "stateMutability": "nonpayable"
  },
  {
    "type": "function", "name": "tasks",
    "inputs": [{ "name": "", "type": "uint256", "internalType": "uint256" }],
    "outputs": [
      { "name": "id", "type": "uint256", "internalType": "uint256" },
      { "name": "agent", "type": "address", "internalType": "address" },
      { "name": "worker", "type": "address", "internalType": "address" },
      { "name": "amount", "type": "uint256", "internalType": "uint256" },
      { "name": "otpHash", "type": "bytes32", "internalType": "bytes32" },
      { "name": "pickupCid", "type": "string", "internalType": "string" },
      { "name": "state", "type": "uint8", "internalType": "enum TaskEscrow.TaskState" },
      { "name": "pickupVerified", "type": "bool", "internalType": "bool" },
      { "name": "gpsVerified", "type": "bool", "internalType": "bool" },
      { "name": "deadline", "type": "uint256", "internalType": "uint256" },
      { "name": "acceptedAt", "type": "uint256", "internalType": "uint256" }
    ],
    "stateMutability": "view"
  },
  {
    "type": "event", "name": "DeliveryGPSVerified",
    "inputs": [{ "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" }],
    "anonymous": false
  },
  {
    "type": "event", "name": "PickupProofSubmitted",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "cid", "type": "string", "indexed": false, "internalType": "string" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "TaskAccepted",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "worker", "type": "address", "indexed": true, "internalType": "address" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "TaskAutoReleased",
    "inputs": [{ "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" }],
    "anonymous": false
  },
  {
    "type": "event", "name": "TaskCompleted",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "worker", "type": "address", "indexed": false, "internalType": "address" },
      { "name": "payout", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "TaskCreated",
    "inputs": [
      { "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" },
      { "name": "agent", "type": "address", "indexed": true, "internalType": "address" },
      { "name": "amount", "type": "uint256", "indexed": false, "internalType": "uint256" }
    ],
    "anonymous": false
  },
  {
    "type": "event", "name": "TaskDisputed",
    "inputs": [{ "name": "taskId", "type": "uint256", "indexed": true, "internalType": "uint256" }],
    "anonymous": false
  }
] as const;

// ─── Task state enum (mirrors Solidity) ───────────────────────────────────────
export const TaskState = {
  CREATED: 0,
  ACCEPTED: 1,
  PICKUP_VERIFIED: 2,
  IN_TRANSIT: 3,
  DELIVERED: 4,
  COMPLETED: 5,
  DISPUTED: 6,
} as const;

export type TaskStateValue = (typeof TaskState)[keyof typeof TaskState];

export const TASK_STATE_LABELS: Record<TaskStateValue, string> = {
  0: "Created",
  1: "Accepted",
  2: "Pickup Verified",
  3: "In Transit",
  4: "Delivered",
  5: "Completed",
  6: "Disputed",
};
