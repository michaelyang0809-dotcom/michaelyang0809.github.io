# Security Specification & "Dirty Dozen" Threat Model

## Data Invariants
1. **Admin Authorization**: Modifying role definitions can only be modified by a verified administrator (`michaelyang0809@gmail.com`).
2. **Access Isolation**: Standard parents/students can only read student data specifically bound to their profiles via `assignedStudentId`.
3. **Write Isolation**: Only authorized Teachers (`teacher` role) or Admins (`admin` role) can log progress records, edit student metrics, or submit errors.
4. **Immutability Protection**: `createdAt`, `id`, `studentId`, and `parentId` fields are immutable after initial record filing.
5. **Timestamp Validation**: Server-generated timestamps MUST be strictly validated using `request.time`.

---

## The "Dirty Dozen" Malicious Payloads

1. **Self-Elevating Admin Profile**: A regular user tries to write a custom profile document containing `role: 'admin'`.
2. **Orphaned Student Linkage**: A regular user sets `assignedStudentId` to a randomly generated ID to scramble relations.
3. **Unauthorized Record Creation**: A user with no assigned role tries to write inside `/records/{recordId}`.
4. **Student Profile Poisoning**: A user injecting a 2MB base64 string as the `examDate` to crash query indexes.
5. **Cross-Tenant List Scraping**: A parent attempting to query `/records` without setting a filter condition matching their `assignedStudentId`.
6. **Student Data Spoofing**: An unauthenticated consumer writing anonymous metadata records to `/students/random_id`.
7. **Score Bypass**: A student updating their own `accuracyRate` to `100` inside a progress log.
8. **Comment Deception**: A user submitting a `ParentComment` with a `parentId` of another user to impersonate them.
9. **Error Status Cheat**: A student marking a math error as `MASTERED` without doing any exercises.
10. **System Parameter Hijacking**: Changing the `radarSkills` distribution mapping directly as a student.
11. **Impersonated Deletion**: A parent attempting to delete another parent's submitted `ParentComments`.
12. **Malicious Path Injection**: Injecting strings with special regex escapers as Firestore IDs (e.g., `../records/hack`) to probe DB vulnerabilities.

---

## Rule Validation Engine Test Definition (`firestore.rules.test.ts`)
```typescript
// Test runner conceptual template
import { initializeTestEnvironment, RulesTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc, deleteDoc, getDoc } from 'firebase/firestore';

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "elaborate-defender-2w1xt",
    firestore: {
      rules: require('fs').readFileSync('firestore.rules', 'utf8')
    }
  });
});

test("blocks self-elevating admin profiles", async () => {
  const aliceDb = testEnv.authenticatedContext("alice", { email: "alice@gmail.com", email_verified: true }).firestore();
  const docRef = doc(aliceDb, "users", "alice");
  await expect(setDoc(docRef, { uid: "alice", email: "alice@gmail.com", role: "admin" }))
    .rejects.toThrow();
});
```
