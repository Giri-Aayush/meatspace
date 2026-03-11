import { ethers } from "ethers";
import crypto from "crypto";

export function generateOTP(): string {
  // 6-digit numeric OTP
  return crypto.randomInt(100000, 999999).toString();
}

// Must match Solidity: keccak256(abi.encodePacked(otp))
// Verified: ethers.keccak256(ethers.toUtf8Bytes("123456"))
//        === keccak256(abi.encodePacked("123456")) in Solidity
export function hashOTP(otp: string): string {
  return ethers.keccak256(ethers.toUtf8Bytes(otp));
}
