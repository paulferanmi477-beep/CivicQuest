import { describe, it, expect, beforeEach } from "vitest";
import { uintCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_PROOF = 101;
const ERR_INVALID_ELECTION_ID = 102;
const ERR_USER_NOT_REGISTERED = 103;
const ERR_USER_NOT_ELIGIBLE = 104;
const ERR_ALREADY_VERIFIED = 105;
const ERR_INVALID_TIMESTAMP = 106;
const ERR_INVALID_REWARD_AMOUNT = 107;
const ERR_AUTHORITY_NOT_SET = 108;
const ERR_INVALID_USER = 109;
const ERR_INVALID_HASH_LENGTH = 110;
const ERR_PROOF_EXPIRED = 111;
const ERR_ELECTION_NOT_FOUND = 112;
const ERR_REWARD_POOL_EMPTY = 113;
const ERR_INVALID_BONUS_RATE = 114;
const ERR_MAX_VERIFICATIONS_EXCEEDED = 115;
const ERR_INVALID_STATUS = 116;
const ERR_INVALID_GRACE_PERIOD = 117;
const ERR_INVALID_LOCATION = 118;
const ERR_INVALID_CURRENCY = 119;
const ERR_INVALID_MIN_PROOF_STRENGTH = 120;
const ERR_INVALID_MAX_PROOF_STRENGTH = 121;
const ERR_INVALID_VERIFICATION_FEE = 122;
const ERR_INSUFFICIENT_FEE = 123;
const ERR_INVALID_UPDATE_PARAM = 124;
const ERR_UPDATE_NOT_ALLOWED = 125;

interface Verification {
  user: string;
  proofHash: Uint8Array;
  electionId: number;
  timestamp: number;
  status: boolean;
  rewardAmount: number;
  location: string;
  currency: string;
}

interface Election {
  startTime: number;
  endTime: number;
  description: string;
  active: boolean;
}

interface VerificationUpdate {
  updateTimestamp: number;
  updater: string;
  newStatus: boolean;
  newReward: number;
}

interface Result<T> {
  ok: boolean;
  value: T;
}

class VotingVerifierMock {
  state: {
    nextVerificationId: number;
    maxVerifications: number;
    verificationFee: number;
    authorityContract: string | null;
    bonusRate: number;
    gracePeriod: number;
    minProofStrength: number;
    maxProofStrength: number;
    verifications: Map<number, Verification>;
    verificationsByUser: Map<string, number[]>;
    elections: Map<number, Election>;
    verificationUpdates: Map<number, VerificationUpdate>;
  } = {
    nextVerificationId: 0,
    maxVerifications: 10000,
    verificationFee: 500,
    authorityContract: null,
    bonusRate: 10,
    gracePeriod: 144,
    minProofStrength: 80,
    maxProofStrength: 100,
    verifications: new Map(),
    verificationsByUser: new Map(),
    elections: new Map(),
    verificationUpdates: new Map(),
  };
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  stxTransfers: Array<{ amount: number; from: string; to: string | null }> = [];
  externalCalls: Map<string, any> = new Map();

  constructor() {
    this.reset();
  }

  reset() {
    this.state = {
      nextVerificationId: 0,
      maxVerifications: 10000,
      verificationFee: 500,
      authorityContract: null,
      bonusRate: 10,
      gracePeriod: 144,
      minProofStrength: 80,
      maxProofStrength: 100,
      verifications: new Map(),
      verificationsByUser: new Map(),
      elections: new Map(),
      verificationUpdates: new Map(),
    };
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.stxTransfers = [];
    this.externalCalls.set(".UserRegistry", { isUserRegistered: () => true });
    this.externalCalls.set(".EducationModule", { hasCompletedBasics: () => true });
    this.externalCalls.set(".RewardPool", { distributeVotingBonus: () => true });
    this.externalCalls.set(".Leaderboard", { updateScore: () => true });
    this.externalCalls.set(".AchievementNFT", { mintAchievement: () => true });
  }

  setAuthorityContract(contractPrincipal: string): Result<boolean> {
    if (this.state.authorityContract !== null) {
      return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    }
    this.state.authorityContract = contractPrincipal;
    return { ok: true, value: true };
  }

  setVerificationFee(newFee: number): Result<boolean> {
    if (newFee < 0) return { ok: false, value: ERR_INVALID_VERIFICATION_FEE };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    this.state.verificationFee = newFee;
    return { ok: true, value: true };
  }

  setBonusRate(newRate: number): Result<boolean> {
    if (newRate > 50) return { ok: false, value: ERR_INVALID_BONUS_RATE };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    this.state.bonusRate = newRate;
    return { ok: true, value: true };
  }

  setGracePeriod(newPeriod: number): Result<boolean> {
    if (newPeriod > 144) return { ok: false, value: ERR_INVALID_GRACE_PERIOD };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    this.state.gracePeriod = newPeriod;
    return { ok: true, value: true };
  }

  setMinProofStrength(newStrength: number): Result<boolean> {
    if (newStrength < 50 || newStrength > 100) return { ok: false, value: ERR_INVALID_MIN_PROOF_STRENGTH };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    this.state.minProofStrength = newStrength;
    return { ok: true, value: true };
  }

  setMaxProofStrength(newStrength: number): Result<boolean> {
    if (newStrength < 50 || newStrength > 100) return { ok: false, value: ERR_INVALID_MAX_PROOF_STRENGTH };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    this.state.maxProofStrength = newStrength;
    return { ok: true, value: true };
  }

  addElection(id: number, start: number, end: number, desc: string): Result<boolean> {
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };
    if (this.caller !== this.state.authorityContract) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (this.state.elections.has(id)) return { ok: false, value: ERR_ALREADY_VERIFIED };
    if (start < this.blockHeight) return { ok: false, value: ERR_INVALID_TIMESTAMP };
    if (end <= start) return { ok: false, value: ERR_INVALID_TIMESTAMP };
    this.state.elections.set(id, { startTime: start, endTime: end, description: desc, active: true });
    return { ok: true, value: true };
  }

  verifyVote(proofHash: Uint8Array, electionId: number, location: string, currency: string): Result<number> {
    if (this.state.nextVerificationId >= this.state.maxVerifications) return { ok: false, value: ERR_MAX_VERIFICATIONS_EXCEEDED };
    if (proofHash.length !== 32) return { ok: false, value: ERR_INVALID_HASH_LENGTH };
    if (electionId <= 0) return { ok: false, value: ERR_INVALID_ELECTION_ID };
    if (!location || location.length > 100) return { ok: false, value: ERR_INVALID_LOCATION };
    if (!["STX", "USD", "BTC"].includes(currency)) return { ok: false, value: ERR_INVALID_CURRENCY };
    if (!(this.externalCalls.get(".UserRegistry")?.isUserRegistered())) return { ok: false, value: ERR_USER_NOT_REGISTERED };
    if (!(this.externalCalls.get(".EducationModule")?.hasCompletedBasics())) return { ok: false, value: ERR_USER_NOT_ELIGIBLE };
    const election = this.state.elections.get(electionId);
    if (!election) return { ok: false, value: ERR_ELECTION_NOT_FOUND };
    if (this.blockHeight < election.startTime || this.blockHeight > election.endTime + this.state.gracePeriod) return { ok: false, value: ERR_PROOF_EXPIRED };
    if (!this.state.authorityContract) return { ok: false, value: ERR_AUTHORITY_NOT_SET };

    this.stxTransfers.push({ amount: this.state.verificationFee, from: this.caller, to: this.state.authorityContract });

    const id = this.state.nextVerificationId;
    const rewardBase = 100;
    const bonus = rewardBase * this.state.bonusRate;
    const totalReward = rewardBase + bonus;
    const verification: Verification = {
      user: this.caller,
      proofHash,
      electionId,
      timestamp: this.blockHeight,
      status: true,
      rewardAmount: totalReward,
      location,
      currency,
    };
    this.state.verifications.set(id, verification);
    let userVerifs = this.state.verificationsByUser.get(this.caller) || [];
    if (userVerifs.length < 10) userVerifs.push(id);
    this.state.verificationsByUser.set(this.caller, userVerifs);
    this.externalCalls.get(".RewardPool")?.distributeVotingBonus();
    this.externalCalls.get(".Leaderboard")?.updateScore();
    this.externalCalls.get(".AchievementNFT")?.mintAchievement();
    this.state.nextVerificationId++;
    return { ok: true, value: id };
  }

  updateVerification(verifId: number, newStatus: boolean, newReward: number): Result<boolean> {
    const verif = this.state.verifications.get(verifId);
    if (!verif) return { ok: false, value: ERR_ELECTION_NOT_FOUND };
    if (verif.user !== this.caller) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newReward <= 0) return { ok: false, value: ERR_INVALID_REWARD_AMOUNT };
    const updated: Verification = { ...verif, status: newStatus, rewardAmount: newReward };
    this.state.verifications.set(verifId, updated);
    this.state.verificationUpdates.set(verifId, {
      updateTimestamp: this.blockHeight,
      updater: this.caller,
      newStatus,
      newReward,
    });
    return { ok: true, value: true };
  }

  getVerificationCount(): Result<number> {
    return { ok: true, value: this.state.nextVerificationId };
  }

  hasVerified(user: string, electionId: number): Result<boolean> {
    const userVerifs = this.state.verificationsByUser.get(user) || [];
    const has = userVerifs.some(id => {
      const v = this.state.verifications.get(id);
      return v && v.electionId === electionId && v.status;
    });
    return { ok: true, value: has };
  }
}

describe("VotingVerifier", () => {
  let contract: VotingVerifierMock;

  beforeEach(() => {
    contract = new VotingVerifierMock();
    contract.reset();
  });

  it("sets authority contract successfully", () => {
    const result = contract.setAuthorityContract("ST2TEST");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.authorityContract).toBe("ST2TEST");
  });

  it("sets verification fee successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setVerificationFee(1000);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.verificationFee).toBe(1000);
  });

  it("sets bonus rate successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setBonusRate(20);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.bonusRate).toBe(20);
  });

  it("sets grace period successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setGracePeriod(100);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.gracePeriod).toBe(100);
  });

  it("sets min proof strength successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setMinProofStrength(70);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.minProofStrength).toBe(70);
  });

  it("sets max proof strength successfully", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.setMaxProofStrength(90);
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    expect(contract.state.maxProofStrength).toBe(90);
  });

  it("adds election successfully", () => {
    contract.setAuthorityContract("ST1TEST");
    contract.blockHeight = 100;
    const result = contract.addElection(1, 101, 200, "Election 2025");
    expect(result.ok).toBe(true);
    expect(result.value).toBe(true);
    const election = contract.state.elections.get(1);
    expect(election?.startTime).toBe(101);
    expect(election?.endTime).toBe(200);
    expect(election?.description).toBe("Election 2025");
    expect(election?.active).toBe(true);
  });

  it("rejects verification with invalid hash length", () => {
    contract.setAuthorityContract("ST2TEST");
    const proofHash = new Uint8Array(31).fill(0);
    const result = contract.verifyVote(proofHash, 1, "CityZ", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_HASH_LENGTH);
  });

  it("rejects update for non-existent verification", () => {
    contract.setAuthorityContract("ST2TEST");
    const result = contract.updateVerification(99, false, 500);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ELECTION_NOT_FOUND);
  });

  it("rejects verification with max exceeded", () => {
    contract.setAuthorityContract("ST2TEST");
    contract.state.maxVerifications = 0;
    const proofHash = new Uint8Array(32).fill(0);
    const result = contract.verifyVote(proofHash, 1, "CityZ", "STX");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_MAX_VERIFICATIONS_EXCEEDED);
  });

  it("parses election id with Clarity", () => {
    const cv = uintCV(1);
    expect(cv.value).toEqual(BigInt(1));
  });
});