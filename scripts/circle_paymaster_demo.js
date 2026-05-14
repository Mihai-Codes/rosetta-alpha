/**
 * Circle Paymaster Integration Demo — Rosetta Alpha
 *
 * Demonstrates gasless USDC transaction UX using Circle Paymaster (ERC-4337 v0.7).
 * Users pay Arc/Arbitrum gas fees in USDC instead of holding native gas tokens.
 *
 * This is the Circle tooling integration for the Agora Agents Hackathon:
 * - Circle Paymaster: https://developers.circle.com/paymaster
 * - Supports ERC-4337 v0.7 on Arbitrum + Base
 *
 * On Arc testnet, USDC is already the native gas token (no Paymaster needed).
 * This script demonstrates the Circle Paymaster pattern for Arbitrum Sepolia,
 * showing how Rosetta Alpha agents can operate gaslessly on any Circle-supported chain.
 *
 * Usage:
 *   npm install
 *   cp .env.example .env  # fill OWNER_PRIVATE_KEY + RECIPIENT_ADDRESS
 *   node scripts/circle_paymaster_demo.js
 */

import "dotenv/config";
import {
  createPublicClient,
  createWalletClient,
  http,
  getContract,
  encodePacked,
  maxUint256,
  erc20Abi,
  parseErc6492Signature,
  hexToBigInt,
} from "viem";
import { arbitrumSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { createBundlerClient } from "viem/account-abstraction";
import { toCircleSmartAccount } from "@circle-fin/modular-wallets-core";

// ---------------------------------------------------------------------------
// Config — read from .env
// ---------------------------------------------------------------------------

const PAYMASTER_V07_ADDRESS =
  process.env.PAYMASTER_V07_ADDRESS ||
  "0x31BE08D380A21fc740883c0BC434FcFc88740b58"; // Arbitrum Sepolia

const USDC_ADDRESS =
  process.env.USDC_ADDRESS ||
  "0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d"; // Arbitrum Sepolia testnet USDC

const OWNER_PRIVATE_KEY = process.env.OWNER_PRIVATE_KEY;
const RECIPIENT_ADDRESS = process.env.RECIPIENT_ADDRESS;

if (!OWNER_PRIVATE_KEY) {
  console.error("❌  Set OWNER_PRIVATE_KEY in .env");
  process.exit(1);
}
if (!RECIPIENT_ADDRESS) {
  console.error("❌  Set RECIPIENT_ADDRESS in .env");
  process.exit(1);
}

// ---------------------------------------------------------------------------
// EIP-2612 permit helper
// ---------------------------------------------------------------------------

const eip2612Abi = [
  ...erc20Abi,
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    stateMutability: "view",
    type: "function",
    name: "nonces",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
  },
  {
    inputs: [],
    name: "version",
    outputs: [{ internalType: "string", name: "", type: "string" }],
    stateMutability: "view",
    type: "function",
  },
];

async function eip2612Permit({ token, chain, ownerAddress, spenderAddress, value }) {
  return {
    types: {
      EIP712Domain: [
        { name: "name",             type: "string"  },
        { name: "version",          type: "string"  },
        { name: "chainId",          type: "uint256" },
        { name: "verifyingContract",type: "address" },
      ],
      Permit: [
        { name: "owner",    type: "address" },
        { name: "spender",  type: "address" },
        { name: "value",    type: "uint256" },
        { name: "nonce",    type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    },
    primaryType: "Permit",
    domain: {
      name:             await token.read.name(),
      version:          await token.read.version(),
      chainId:          chain.id,
      verifyingContract: token.address,
    },
    message: {
      owner:    ownerAddress,
      spender:  spenderAddress,
      value:    value.toString(),
      nonce:    (await token.read.nonces([ownerAddress])).toString(),
      deadline: maxUint256.toString(), // MAX — Paymaster can't use block.timestamp (4337 opcode restriction)
    },
  };
}

async function signPermit({ tokenAddress, client, account, spenderAddress, permitAmount }) {
  const token = getContract({ client, address: tokenAddress, abi: eip2612Abi });

  const permitData = await eip2612Permit({
    token,
    chain: client.chain,
    ownerAddress: account.address,
    spenderAddress,
    value: permitAmount,
  });

  const wrappedSig = await account.signTypedData(permitData);

  const isValid = await client.verifyTypedData({
    ...permitData,
    address: account.address,
    signature: wrappedSig,
  });

  if (!isValid) {
    throw new Error(`Invalid permit signature for ${account.address}`);
  }

  const { signature } = parseErc6492Signature(wrappedSig);
  return signature;
}

// ---------------------------------------------------------------------------
// Main: demonstrate gasless USDC transfer via Circle Paymaster
// ---------------------------------------------------------------------------

async function main() {
  const chain = arbitrumSepolia;

  console.log("🌐  Rosetta Alpha — Circle Paymaster Demo");
  console.log("   Chain:     Arbitrum Sepolia (ERC-4337 v0.7)");
  console.log("   Paymaster:", PAYMASTER_V07_ADDRESS);
  console.log("   USDC:     ", USDC_ADDRESS);
  console.log();

  // ── 1. Setup clients ────────────────────────────────────────────────────
  const client = createPublicClient({ chain, transport: http() });
  const owner = privateKeyToAccount(OWNER_PRIVATE_KEY);

  // Circle smart account (ERC-4337 compatible)
  const account = await toCircleSmartAccount({ client, owner });
  console.log("✅  Smart account:", account.address);

  // ── 2. Check USDC balance ───────────────────────────────────────────────
  const usdc = getContract({ client, address: USDC_ADDRESS, abi: eip2612Abi });
  const usdcBalance = await usdc.read.balanceOf([account.address]);
  const usdcHuman = Number(usdcBalance) / 1e6;

  console.log(`💵  USDC balance: $${usdcHuman.toFixed(2)}`);

  if (usdcBalance < 1_000_000n) {
    console.log(
      `\n⚠️  Fund ${account.address} with USDC on Arbitrum Sepolia:\n` +
      `   https://faucet.circle.com\n` +
      `   Then re-run this script.`
    );
    process.exit(0);
  }

  // ── 3. Configure Paymaster (EIP-2612 permit for USDC allowance) ─────────
  const PERMIT_AMOUNT = 10_000_000n; // $10 USDC max allowance for gas

  const paymaster = {
    async getPaymasterData() {
      console.log("🔏  Signing EIP-2612 permit for Paymaster USDC allowance...");

      const permitSignature = await signPermit({
        tokenAddress: USDC_ADDRESS,
        client,
        account,
        spenderAddress: PAYMASTER_V07_ADDRESS,
        permitAmount: PERMIT_AMOUNT,
      });

      // Paymaster data layout: [mode(1)] [usdcAddress(20)] [permitAmount(32)] [permitSig(65+)]
      const paymasterData = encodePacked(
        ["uint8", "address", "uint256", "bytes"],
        [0, USDC_ADDRESS, PERMIT_AMOUNT, permitSignature]
      );

      return {
        paymaster:                      PAYMASTER_V07_ADDRESS,
        paymasterData,
        paymasterVerificationGasLimit:  200_000n,
        paymasterPostOpGasLimit:        15_000n,
        isFinal:                        true,
      };
    },
  };

  // ── 4. Connect bundler (Pimlico public endpoint) ─────────────────────────
  const bundlerClient = createBundlerClient({
    account,
    client,
    paymaster,
    userOperation: {
      estimateFeesPerGas: async ({ bundlerClient }) => {
        const { standard: fees } = await bundlerClient.request({
          method: "pimlico_getUserOperationGasPrice",
        });
        return {
          maxFeePerGas:         hexToBigInt(fees.maxFeePerGas),
          maxPriorityFeePerGas: hexToBigInt(fees.maxPriorityFeePerGas),
        };
      },
    },
    transport: http(`https://public.pimlico.io/v2/${chain.id}/rpc`),
  });

  // ── 5. Submit UserOperation: transfer 0.01 USDC gaslessly ───────────────
  const TRANSFER_AMOUNT = 10_000n; // 0.01 USDC (6 decimals)

  console.log(`\n📤  Submitting UserOperation:`);
  console.log(`    Transfer ${Number(TRANSFER_AMOUNT) / 1e6} USDC → ${RECIPIENT_ADDRESS}`);
  console.log(`    Gas paid in USDC via Circle Paymaster (no ETH needed)`);

  const userOpHash = await bundlerClient.sendUserOperation({
    account,
    calls: [
      {
        to:           USDC_ADDRESS,
        abi:          eip2612Abi,
        functionName: "transfer",
        args:         [RECIPIENT_ADDRESS, TRANSFER_AMOUNT],
      },
    ],
  });

  console.log("\n⏳  Waiting for UserOperation receipt...");
  console.log("    UserOp hash:", userOpHash);

  const receipt = await bundlerClient.waitForUserOperationReceipt({ hash: userOpHash });

  console.log("\n🎉  Transaction confirmed!");
  console.log("    Tx hash:    ", receipt.receipt.transactionHash);
  console.log("    Block:      ", receipt.receipt.blockNumber.toString());
  console.log("    Gas in USDC: paid by Circle Paymaster ✅");
  console.log(
    `\n    View on Arbiscan: https://sepolia.arbiscan.io/tx/${receipt.receipt.transactionHash}`
  );

  process.exit(0);
}

main().catch((err) => {
  console.error("❌  Error:", err.message || err);
  process.exit(1);
});
