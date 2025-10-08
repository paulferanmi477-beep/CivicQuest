(define-constant ERR-NOT-AUTHORIZED u100)
(define-constant ERR-INVALID-PROOF u101)
(define-constant ERR-INVALID-ELECTION-ID u102)
(define-constant ERR-USER-NOT-REGISTERED u103)
(define-constant ERR-USER-NOT-ELIGIBLE u104)
(define-constant ERR-ALREADY-VERIFIED u105)
(define-constant ERR-INVALID-TIMESTAMP u106)
(define-constant ERR-INVALID-REWARD-AMOUNT u107)
(define-constant ERR-AUTHORITY-NOT-SET u108)
(define-constant ERR-INVALID-USER u109)
(define-constant ERR-INVALID-HASH-LENGTH u110)
(define-constant ERR-PROOF-EXPIRED u111)
(define-constant ERR-ELECTION-NOT-FOUND u112)
(define-constant ERR-REWARD-POOL-EMPTY u113)
(define-constant ERR-INVALID-BONUS-RATE u114)
(define-constant ERR-MAX-VERIFICATIONS-EXCEEDED u115)
(define-constant ERR-INVALID-STATUS u116)
(define-constant ERR-INVALID-GRACE-PERIOD u117)
(define-constant ERR-INVALID-LOCATION u118)
(define-constant ERR-INVALID-CURRENCY u119)
(define-constant ERR-INVALID-MIN-PROOF-STRENGTH u120)
(define-constant ERR-INVALID-MAX-PROOF-STRENGTH u121)
(define-constant ERR-INVALID-VERIFICATION-FEE u122)
(define-constant ERR-INSUFFICIENT-FEE u123)
(define-constant ERR-INVALID-UPDATE-PARAM u124)
(define-constant ERR-UPDATE-NOT-ALLOWED u125)

(define-data-var next-verification-id uint u0)
(define-data-var max-verifications uint u10000)
(define-data-var verification-fee uint u500)
(define-data-var authority-contract (optional principal) none)
(define-data-var bonus-rate uint u10)
(define-data-var grace-period uint u144)
(define-data-var min-proof-strength uint u80)
(define-data-var max-proof-strength uint u100)

(define-map verifications
  uint
  {
    user: principal,
    proof-hash: (buff 32),
    election-id: uint,
    timestamp: uint,
    status: bool,
    reward-amount: uint,
    location: (string-utf8 100),
    currency: (string-utf8 20)
  }
)

(define-map verifications-by-user
  principal
  (list 10 uint)
)

(define-map elections
  uint
  {
    start-time: uint,
    end-time: uint,
    description: (string-utf8 200),
    active: bool
  }
)

(define-map verification-updates
  uint
  {
    update-timestamp: uint,
    updater: principal,
    new-status: bool,
    new-reward: uint
  }
)

(define-read-only (get-verification (id uint))
  (map-get? verifications id)
)

(define-read-only (get-verification-updates (id uint))
  (map-get? verification-updates id)
)

(define-read-only (get-verifications-for-user (user principal))
  (map-get? verifications-by-user user)
)

(define-read-only (get-election (id uint))
  (map-get? elections id)
)

(define-private (validate-user (user principal))
  (if (is-eq user tx-sender)
      (ok true)
      (err ERR-INVALID-USER))
)

(define-private (validate-proof-hash (hash (buff 32)))
  (if (is-eq (len hash) u32)
      (ok true)
      (err ERR-INVALID-HASH-LENGTH))
)

(define-private (validate-election-id (id uint))
  (if (> id u0)
      (ok true)
      (err ERR-INVALID-ELECTION-ID))
)

(define-private (validate-timestamp (ts uint))
  (if (>= ts block-height)
      (ok true)
      (err ERR-INVALID-TIMESTAMP))
)

(define-private (validate-reward-amount (amount uint))
  (if (> amount u0)
      (ok true)
      (err ERR-INVALID-REWARD-AMOUNT))
)

(define-private (validate-status (status bool))
  (ok true)
)

(define-private (validate-grace-period (period uint))
  (if (<= period u144)
      (ok true)
      (err ERR-INVALID-GRACE-PERIOD))
)

(define-private (validate-location (loc (string-utf8 100)))
  (if (and (> (len loc) u0) (<= (len loc) u100))
      (ok true)
      (err ERR-INVALID-LOCATION))
)

(define-private (validate-currency (cur (string-utf8 20)))
  (if (or (is-eq cur u"STX") (is-eq cur u"USD") (is-eq cur u"BTC"))
      (ok true)
      (err ERR-INVALID-CURRENCY))
)

(define-private (validate-min-proof-strength (strength uint))
  (if (and (>= strength u50) (<= strength u100))
      (ok true)
      (err ERR-INVALID-MIN-PROOF-STRENGTH))
)

(define-private (validate-max-proof-strength (strength uint))
  (if (and (>= strength u50) (<= strength u100))
      (ok true)
      (err ERR-INVALID-MAX-PROOF-STRENGTH))
)

(define-private (validate-verification-fee (fee uint))
  (if (>= fee u0)
      (ok true)
      (err ERR-INVALID-VERIFICATION-FEE))
)

(define-private (validate-bonus-rate (rate uint))
  (if (<= rate u50)
      (ok true)
      (err ERR-INVALID-BONUS-RATE))
)

(define-private (is-proof-valid (hash (buff 32)) (id uint))
  (let ((election (map-get? elections id)))
    (match election
      e
      (if (and (>= block-height (get start-time e)) (<= block-height (+ (get end-time e) (var-get grace-period))))
        (ok true)
        (err ERR-PROOF-EXPIRED))
      (err ERR-ELECTION-NOT-FOUND))))
(define-private (is-user-registered (user principal))
  (contract-call? .UserRegistry is-user-registered user))

(define-private (is-user-eligible (user principal))
  (contract-call? .EducationModule has-completed-basics user))

(define-public (set-authority-contract (contract-principal principal))
  (begin
    (asserts! (is-none (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set authority-contract (some contract-principal))
    (ok true)
  )
)

(define-public (set-verification-fee (new-fee uint))
  (begin
    (try! (validate-verification-fee new-fee))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set verification-fee new-fee)
    (ok true)
  )
)

(define-public (set-bonus-rate (new-rate uint))
  (begin
    (try! (validate-bonus-rate new-rate))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set bonus-rate new-rate)
    (ok true)
  )
)

(define-public (set-grace-period (new-period uint))
  (begin
    (try! (validate-grace-period new-period))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set grace-period new-period)
    (ok true)
  )
)

(define-public (set-min-proof-strength (new-strength uint))
  (begin
    (try! (validate-min-proof-strength new-strength))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set min-proof-strength new-strength)
    (ok true)
  )
)

(define-public (set-max-proof-strength (new-strength uint))
  (begin
    (try! (validate-max-proof-strength new-strength))
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (var-set max-proof-strength new-strength)
    (ok true)
  )
)

(define-public (add-election (id uint) (start uint) (end uint) (desc (string-utf8 200)))
  (begin
    (asserts! (is-some (var-get authority-contract)) (err ERR-AUTHORITY-NOT-SET))
    (asserts! (is-eq tx-sender (unwrap! (var-get authority-contract) (err ERR-NOT-AUTHORIZED))) (err ERR-NOT-AUTHORIZED))
    (asserts! (is-none (map-get? elections id)) (err ERR_GROUP-ALREADY-EXISTS))
    (try! (validate-timestamp start))
    (asserts! (> end start) (err ERR-INVALID_TIMESTAMP))
    (map-set elections id
      {
        start-time: start,
        end-time: end,
        description: desc,
        active: true
      }
    )
    (ok true)
  )
)

(define-public (verify-vote (proof-hash (buff 32)) (election-id uint) (location (string-utf8 100)) (currency (string-utf8 20)))
  (let (
    (next-id (var-get next-verification-id))
    (user tx-sender)
    (current-max (var-get max-verifications))
    (authority (var-get authority-contract))
    (registered (unwrap! (is-user-registered user) (err ERR-USER-NOT-REGISTERED)))
    (eligible (unwrap! (is-user-eligible user) (err ERR-USER-NOT-ELIGIBLE)))
    (reward-base u100)
    (bonus (* reward-base (var-get bonus-rate)))
    (total-reward (+ reward-base bonus))
  )
    (asserts! (< next-id current-max) (err ERR-MAX-VERIFICATIONS-EXCEEDED))
    (try! (validate-proof-hash proof-hash))
    (try! (validate-election-id election-id))
    (try! (validate-location location))
    (try! (validate-currency currency))
    (asserts! registered (err ERR-USER-NOT-REGISTERED))
    (asserts! eligible (err ERR-USER-NOT-ELIGIBLE))
    (try! (is-proof-valid proof-hash election-id))
    (asserts! (is-some authority) (err ERR-AUTHORITY-NOT-SET))
    (try! (stx-transfer? (var-get verification-fee) tx-sender (unwrap! authority (err ERR-NOT-AUTHORIZED))))
    (map-set verifications next-id
      {
        user: user,
        proof-hash: proof-hash,
        election-id: election-id,
        timestamp: block-height,
        status: true,
        reward-amount: total-reward,
        location: location,
        currency: currency
      }
    )
    (let ((user-verifs (default-to (list) (map-get? verifications-by-user user))))
      (map-set verifications-by-user user (unwrap-panic (as-max-len? (append user-verifs next-id) u10)))
    )
    (try! (contract-call? .RewardPool distribute-voting-bonus user total-reward))
    (try! (contract-call? .Leaderboard update-score user total-reward))
    (try! (contract-call? .AchievementNFT mint-achievement user election-id))
    (print { event: "vote-verified", id: next-id, user: user, election: election-id })
    (var-set next-verification-id (+ next-id u1))
    (ok next-id)
  )
)

(define-public (update-verification (verif-id uint) (new-status bool) (new-reward uint))
  (let ((verif (map-get? verifications verif-id)))
    (match verif
      v
      (begin
        (asserts! (is-eq (get user v) tx-sender) (err ERR-NOT-AUTHORIZED))
        (try! (validate-status new-status))
        (try! (validate-reward-amount new-reward))
        (map-set verifications verif-id
          (merge v { status: new-status, reward-amount: new-reward })
        )
        (map-set verification-updates verif-id
          {
            update-timestamp: block-height,
            updater: tx-sender,
            new-status: new-status,
            new-reward: new-reward
          }
        )
        (print { event: "verification-updated", id: verif-id })
        (ok true)
      )
      (err ERR_GROUP_NOT_FOUND)
    )
  )
)

(define-public (get-verification-count)
  (ok (var-get next-verification-id))
)

(define-public (has-verified (user principal) (election-id uint))
  (let ((user-verifs (default-to (list) (map-get? verifications-by-user user))))
    (ok (fold
          (lambda (vid acc) (or acc (let ((v (unwrap-panic (map-get? verifications vid)))) (and (is-eq (get election-id v) election-id) (get status v)))))
          user-verifs
          false))
  )
)