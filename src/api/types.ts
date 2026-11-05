export interface BaseItem {
  id: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
  [key: string]: unknown;
}

export interface MindsetOption {
  id: number;
  questionId: number;
  label: string;
  isActive: boolean;
  sortOrder: number;
}

export interface DeleteResult {
  id: number;
  deleted: boolean;
  deactivated: boolean;
  usageCount: number;
  message?: string;
}

export interface Stats {
  users: { total: number; onboarded: number; verified: number; pendingVerification: number; blocked: number; newLast7Days: number };
  onboardingFunnel: { step: number; users: number }[];
  signupsByDay: { day: string; users: number }[];
  topInterests: { name: string; users: number }[];
  masterData: Record<string, { total: number; active: number }>;
  network: NetworkStats;
}

export interface NetworkStats {
  connections: number;
  newConnections7d: number;
  requests: { total: number; pending: number; accepted: number; declined: number; withdrawn: number };
  acceptanceRate: number | null;
  bookmarks: number;
  notOpenToConnect: number;
  hiddenFromDiscovery: number;
  requestsByDay: { day: string; requests: number; accepted: number }[];
}

export type RequestStatus = 'pending' | 'accepted' | 'declined' | 'withdrawn';

export interface MemberLite { id: number; fullName: string | null; jobTitle: string | null; photoUrl: string | null; status: 'active' | 'blocked' }

export interface ConnectionRequestRow {
  id: number;
  status: RequestStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  sender: MemberLite;
  receiver: MemberLite;
}

export interface ConnectionRow { userA: MemberLite; userB: MemberLite; connectedAt: string; requestId: number | null }

export interface UserNetwork {
  connections: number;
  requestsSent: { total: number; accepted: number; pending: number; last24h: number };
  requestsReceived: { total: number; pending: number };
  saved: number;
  savedBy: number;
  recentConnections: { id: number; fullName: string | null; jobTitle: string | null; photoUrl: string | null; connectedAt: string }[];
}

export type VerificationStatus = 'pending' | 'verified' | 'rejected';

export interface Verification {
  id: number;
  status: VerificationStatus;
  reason: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  reviewedBy: { id: number; name: string } | null;
  selfieUrl: string;
  user: { id: number; fullName: string | null; phone: string | null; email: string | null; photoPath: string | null };
}

export interface UserRow {
  id: number;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
  onboardingStep: number;
  verificationStatus: 'none' | VerificationStatus;
  status: 'active' | 'blocked';
  lastLoginAt: string | null;
  createdAt: string;
  connections: number;
  openToConnect: boolean;
  nearbyDiscovery: boolean;
}

export interface UserDetail {
  id: number;
  phone: string | null;
  email: string | null;
  fullName: string | null;
  dob: string | null;
  gender: string | null;
  linkedinUrl: string | null;
  about: string | null;
  photoUrl: string | null;
  work: {
    jobTitle: string | null;
    industry: { id: number; name: string } | null;
    company: string | null;
    experienceLevel: { id: number; label: string } | null;
    skills: { id: number; name: string }[];
  };
  interests: { id: number; name: string }[];
  reasons: { id: number; title: string; icon: string }[];
  mindset: { questionId: number; question: string; optionId: number; answer: string }[];
  community: {
    city: { id: number; name: string; state: string } | null;
    locality: { id: number; name: string } | null;
    lat: number | null;
    lng: number | null;
    connectMode: string | null;
    radiusKm: number | null;
    availability: string[];
    nearbyDiscovery: boolean;
    openToConnect: boolean;
  };
  onboarding: { step: number; stepName: string; completed: boolean };
  verificationStatus: 'none' | VerificationStatus;
  status: 'active' | 'blocked';
  createdAt: string;
  verifications: { id: number; status: VerificationStatus; reason: string | null; submittedAt: string; reviewedAt: string | null }[];
  network: UserNetwork;
}
