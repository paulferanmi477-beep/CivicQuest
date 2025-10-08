# 🎮 CivicQuest: Gamified Civic Education and Voting Incentives

Welcome to CivicQuest, a Web3 app built on the Stacks blockchain using Clarity smart contracts! This project tackles the real-world problem of low civic engagement, voter apathy, and misinformation in democracy. By gamifying education and rewarding participation, it educates users on civics (e.g., government structures, rights, and history) while incentivizing real-world voting through transparent, blockchain-verified rewards. Users earn tokens, NFTs, and badges, fostering a community-driven approach to better citizenship—all secured on the blockchain for trust and immutability.

## ✨ Features

🎓 Interactive civic education modules with quizzes and challenges  
🏆 Earn NFTs and tokens for completing lessons and achieving milestones  
🗳️ Verified voting incentives: Prove real-world voting to claim bonuses  
📊 Leaderboards and gamification elements to compete with friends  
🔒 Transparent reward pools funded by donations or sponsors  
🗣️ Community governance for proposing new content or rules  
🚫 Anti-cheat mechanisms to ensure fair play  
📈 Track personal progress and civic impact  

## 🛠 How It Works

CivicQuest uses 8 interconnected Clarity smart contracts to handle user interactions, education, rewards, and verification. The system is decentralized, ensuring no single entity controls education content or rewards. Users interact via a frontend app that calls these contracts.

**For Users (Citizens)**

- Register your account and start with basic civic quizzes.
- Complete modules to earn points, which convert to tokens or NFTs.
- Participate in mock votes or verify real-world voting (e.g., via hashed proof of ballot without revealing choices) to unlock bonuses.
- Climb leaderboards and stake tokens for extra rewards.

**For Educators/Contributors**

- Submit new quiz content via governance proposals.
- Earn rewards if your content is approved and used by the community.

**For Verifiers/Sponsors**

- Donate to reward pools to incentivize participation.
- View transparent logs of all verifications and distributions.

### Core Smart Contracts (8 in Total)

1. **UserRegistry.clar**: Manages user registrations, profiles, and basic authentication (e.g., linking Stacks addresses). Prevents duplicate accounts and stores user progress hashes.

2. **EducationModule.clar**: Handles civic quizzes and lessons. Stores question banks, validates answers, and issues completion certificates as on-chain events.

3. **RewardToken.clar**: A fungible token (SIP-010 compliant) for earning and distributing rewards. Users mint tokens based on education milestones or voting proofs.

4. **AchievementNFT.clar**: Non-fungible token (SIP-009) contract for badges and achievements (e.g., "Civic Master" NFT). Minted upon completing challenges.

5. **VotingVerifier.clar**: Verifies real-world voting proofs (e.g., hashed timestamps or zero-knowledge proofs of participation). Triggers bonus rewards without compromising privacy.

6. **GovernanceDAO.clar**: Enables community proposals and voting on new content, rule changes, or reward adjustments. Uses token-weighted voting for fairness.

7. **RewardPool.clar**: Manages pooled funds from sponsors. Distributes tokens algorithmically based on user activity and verifications, with anti-sybil protections.

8. **Leaderboard.clar**: Tracks and updates global/local leaderboards based on points from education and voting. Emits events for real-time frontend updates.

**Technical Flow Example**

- A user calls `register-user` in UserRegistry to start.
- They interact with EducationModule's `submit-quiz` function, which checks answers and calls RewardToken's `mint-reward`.
- For voting incentives: Upload a proof to VotingVerifier, which validates and triggers RewardPool to release bonuses.
- All actions are immutable and auditable on the Stacks blockchain.

Get started by deploying these Clarity contracts on Stacks testnet and building a simple React frontend to interact with them. Let's make democracy fun and rewarding! 🚀