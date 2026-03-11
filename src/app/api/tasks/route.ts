import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateOTP, hashOTP } from "@/lib/otp";
import { getTaskEscrow, getUSDC, ensureUSDCApproval, parseTaskCreatedId } from "@/lib/contract";
import { TaskState, TASK_STATE_LABELS } from "@/constants";

// GET /api/tasks — list all tasks with merged on-chain state
export async function GET() {
  try {
    const records = db.all();
    const escrow = getTaskEscrow();

    const tasks = await Promise.all(
      records.map(async (record) => {
        try {
          const onChain = await escrow.tasks(record.id);
          return {
            id: record.id,
            description: record.description,
            shopName: record.shopName,
            shopLat: record.shopLat,
            shopLng: record.shopLng,
            destLat: record.destLat,
            destLng: record.destLng,
            itemList: record.itemList,
            deadline: record.deadline,
            createdAt: record.createdAt,
            agentCallbackUrl: record.agentCallbackUrl,
            // on-chain fields
            state: Number(onChain.state),
            stateLabel: TASK_STATE_LABELS[Number(onChain.state) as keyof typeof TASK_STATE_LABELS],
            worker: onChain.worker,
            agent: onChain.agent,
            amount: onChain.amount.toString(),
            pickupVerified: onChain.pickupVerified,
            gpsVerified: onChain.gpsVerified,
            pickupCid: onChain.pickupCid || null,
            // otp deliberately omitted
          };
        } catch {
          return { id: record.id, error: "Failed to fetch on-chain state" };
        }
      })
    );

    return NextResponse.json(tasks);
  } catch (err) {
    console.error("GET /api/tasks error:", err);
    return NextResponse.json({ error: "Failed to list tasks" }, { status: 500 });
  }
}

// POST /api/tasks — create a new task, lock USDC in escrow
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      description,
      shopName,
      shopLat,
      shopLng,
      destLat,
      destLng,
      itemList,
      deadline, // ISO string or unix timestamp
      recipientContact,
      amount,   // number in USDC (e.g. 0.1)
      agentCallbackUrl,
    } = body;

    // Validate required fields
    if (!description || shopLat == null || shopLng == null || destLat == null || destLng == null
        || !itemList || !deadline || amount == null) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const deadlineUnix = typeof deadline === "number"
      ? deadline
      : Math.floor(new Date(deadline).getTime() / 1000);

    if (deadlineUnix <= Math.floor(Date.now() / 1000)) {
      return NextResponse.json({ error: "Deadline must be in the future" }, { status: 400 });
    }

    // USDC has 6 decimals
    const amountWei = BigInt(Math.round(Number(amount) * 1_000_000));
    if (amountWei <= 0n) {
      return NextResponse.json({ error: "Amount must be > 0" }, { status: 400 });
    }

    // Generate OTP and compute hash (hash goes on-chain, plaintext stored server-side only)
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Ensure server wallet has approved enough USDC
    await ensureUSDCApproval(amountWei);

    // Call createTask on the contract
    const escrow = getTaskEscrow();
    const tx = await escrow.createTask(otpHash, amountWei, deadlineUnix);
    const receipt = await tx.wait();

    const taskId = parseTaskCreatedId(receipt, escrow);

    // Store off-chain metadata (no otp exposed in responses)
    db.set(taskId, {
      id: taskId,
      description,
      shopName: shopName ?? "",
      shopLat: Number(shopLat),
      shopLng: Number(shopLng),
      destLat: Number(destLat),
      destLng: Number(destLng),
      itemList: Array.isArray(itemList) ? itemList : [itemList],
      deadline: deadlineUnix,
      recipientContact: recipientContact ?? "",
      otp, // server-side only
      agentCallbackUrl,
      createdAt: Math.floor(Date.now() / 1000),
    });

    // In demo: log OTP so it can be "SMS'd" to recipient
    console.log(`\n📱 OTP for task #${taskId}: ${otp} (send to ${recipientContact ?? "recipient"})\n`);

    return NextResponse.json({
      taskId,
      txHash: receipt.hash,
      state: TaskState.CREATED,
      stateLabel: "Created",
      amount: amount.toString(),
    });
  } catch (err) {
    console.error("POST /api/tasks error:", err);
    const message = err instanceof Error ? err.message : "Failed to create task";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
