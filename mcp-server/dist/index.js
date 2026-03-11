/**
 * Meatspace MCP Server — lets Claude create and monitor delivery tasks.
 *
 * Stdio transport only. NEVER use console.log (corrupts JSON-RPC).
 * Use console.error for debug output.
 *
 * Env vars:
 *   MEATSPACE_BASE_URL  — Next.js server URL (default: http://localhost:3000)
 *   MEATSPACE_API_KEY   — bypasses x402 gate for server-to-server calls
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema, } from "@modelcontextprotocol/sdk/types.js";
const BASE_URL = process.env.MEATSPACE_BASE_URL ?? "http://localhost:3000";
const API_KEY = process.env.MEATSPACE_API_KEY ?? "";
function apiHeaders() {
    const h = { "Content-Type": "application/json" };
    if (API_KEY)
        h["X-API-KEY"] = API_KEY;
    return h;
}
const server = new Server({ name: "meatspace", version: "1.0.0" }, { capabilities: { tools: {} } });
server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
        {
            name: "create_task",
            description: "Create a new pickup-and-deliver task on the Meatspace marketplace. " +
                "A human worker will be paid in USDC to complete the delivery.",
            inputSchema: {
                type: "object",
                properties: {
                    description: {
                        type: "string",
                        description: "Human-readable description of the task",
                    },
                    shopName: {
                        type: "string",
                        description: "Name of the pickup location (e.g. Apollo Pharmacy, City)",
                    },
                    shopLat: { type: "number", description: "Pickup location latitude" },
                    shopLng: { type: "number", description: "Pickup location longitude" },
                    destLat: { type: "number", description: "Delivery destination latitude" },
                    destLng: { type: "number", description: "Delivery destination longitude" },
                    itemList: {
                        type: "array",
                        items: { type: "string" },
                        description: "List of items to pick up",
                    },
                    amount: {
                        type: "number",
                        description: "Worker payment in USDC (e.g. 0.1)",
                    },
                    deadlineMinutes: {
                        type: "number",
                        description: "Minutes from now until task expires",
                    },
                    recipientContact: {
                        type: "string",
                        description: "Phone number or contact for OTP delivery (optional)",
                    },
                },
                required: [
                    "description",
                    "shopName",
                    "shopLat",
                    "shopLng",
                    "destLat",
                    "destLng",
                    "itemList",
                    "amount",
                    "deadlineMinutes",
                ],
            },
        },
        {
            name: "get_task_status",
            description: "Get the current on-chain state and metadata for a task.",
            inputSchema: {
                type: "object",
                properties: {
                    taskId: { type: "number", description: "Task ID returned by create_task" },
                },
                required: ["taskId"],
            },
        },
        {
            name: "list_open_tasks",
            description: "List all tasks with their current state, worker, and amount.",
            inputSchema: {
                type: "object",
                properties: {},
            },
        },
    ],
}));
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
        if (name === "create_task") {
            const deadline = Math.floor(Date.now() / 1000) + args.deadlineMinutes * 60;
            const body = { ...args, deadline, deadlineMinutes: undefined };
            delete body.deadlineMinutes;
            const res = await fetch(`${BASE_URL}/api/tasks`, {
                method: "POST",
                headers: apiHeaders(),
                body: JSON.stringify(body),
            });
            const data = await res.json();
            if (!res.ok) {
                return {
                    content: [{ type: "text", text: `Error creating task: ${JSON.stringify(data)}` }],
                    isError: true,
                };
            }
            return {
                content: [
                    {
                        type: "text",
                        text: `Task #${data.taskId} created!\n` +
                            `State: ${data.stateLabel}\n` +
                            `Amount: ${data.amount} USDC\n` +
                            `Tx: ${data.txHash}`,
                    },
                ],
            };
        }
        if (name === "get_task_status") {
            const res = await fetch(`${BASE_URL}/api/tasks/${args.taskId}`, {
                headers: apiHeaders(),
            });
            const data = await res.json();
            if (!res.ok || data.error) {
                return {
                    content: [{ type: "text", text: `Error: ${data.error ?? "Unknown"}` }],
                    isError: true,
                };
            }
            const amountUSDC = (Number(data.amount) / 1_000_000).toFixed(2);
            const workerShort = data.worker === "0x0000000000000000000000000000000000000000"
                ? "None"
                : `${data.worker.slice(0, 6)}…${data.worker.slice(-4)}`;
            return {
                content: [
                    {
                        type: "text",
                        text: `Task #${data.id}: ${data.description}\n` +
                            `State: ${data.stateLabel} (${data.state})\n` +
                            `Amount: ${amountUSDC} USDC\n` +
                            `Worker: ${workerShort}\n` +
                            `Pickup verified: ${data.pickupVerified}\n` +
                            `GPS verified: ${data.gpsVerified}\n` +
                            `IPFS proof: ${data.pickupCid ? `https://ipfs.io/ipfs/${data.pickupCid}` : "None"}`,
                    },
                ],
            };
        }
        if (name === "list_open_tasks") {
            const res = await fetch(`${BASE_URL}/api/tasks`, { headers: apiHeaders() });
            const data = await res.json();
            if (!Array.isArray(data)) {
                return {
                    content: [{ type: "text", text: `Error listing tasks: ${JSON.stringify(data)}` }],
                    isError: true,
                };
            }
            if (data.length === 0) {
                return { content: [{ type: "text", text: "No tasks found." }] };
            }
            const lines = data.map((t) => {
                const amt = (Number(t.amount) / 1_000_000).toFixed(2);
                return `#${t.id} [${t.stateLabel}] ${t.description} — ${amt} USDC`;
            });
            return {
                content: [{ type: "text", text: `${data.length} task(s):\n${lines.join("\n")}` }],
            };
        }
        throw new Error(`Unknown tool: ${name}`);
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        return { content: [{ type: "text", text: `Tool error: ${msg}` }], isError: true };
    }
});
async function main() {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("[meatspace-mcp] Server running on stdio");
}
main().catch((err) => {
    console.error("[meatspace-mcp] Fatal:", err);
    process.exit(1);
});
