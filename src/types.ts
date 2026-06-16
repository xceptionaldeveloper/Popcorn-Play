/**
 * POPCORN PLAY types
 */

export interface DownloadLink {
  quality: string; // e.g., '1080p', '720p', '480p', '360p'
  url: string;
}

export interface Episode {
  id: string;
  number: number;
  title: string;
  videoUrl: string;
  isFiller: boolean;
  downloadLinks?: DownloadLink[];
}

export type ContentCategory = 'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial';

export interface ContentItem {
  id: string;
  title: string;
  coverUrl: string;
  videoUrl: string; // Used for Direct Watch (Movies or standalone)
  downloadUrl?: string; // Keep legacy string for backward compatibility
  downloadLinks?: DownloadLink[];
  tags: string[];
  category: ContentCategory;
  isPremium: boolean;
  isAdult: boolean; // Adult (18+) parental setting
  schedule: string; // Day of scheduling (e.g. "Monday", "Weekly")
  description: string;
  rating: number;
  status?: 'ongoing' | 'completed'; // Used for Series
  episodes?: Episode[];              // Episodic content (Anime, Drama, etc.)
  zipUrl?: string;                   // Link for download complete pack
  createdAt?: number;
  updatedAt?: number;
}

export interface BannerItem {
  id: string;
  title: string;
  description: string;
  coverUrl: string;
  category?: 'Movies' | 'Anime' | 'Drama' | 'Cartoon' | 'Serial';
  contentId?: string;
  isActive: boolean;
  type: 'custom' | 'auto';
  link?: string;
  createdAt?: number;
  expirationDays?: number;
}

export interface NotificationItem {
  id: string;
  msg: string;
  time: string;
  read?: boolean;
  type?: 'custom' | 'auto';
  contentId?: string;
  createdAt?: number;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'admin';
  senderName: string;
  senderId: string;
  text: string;
  timestamp: string;
}

export interface SupportSession {
  userId: string;
  userName: string;
  userEmail: string;
  messages: ChatMessage[];
  lastUpdated: string;
  unreadCount?: number;
  deletedByAdmin?: boolean;
}

export interface PaymentRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  method: string;
  senderNumber: string;
  transactionId: string;
  amount: number;
  timestamp: string;
  status: 'pending' | 'approved' | 'rejected';
  durationDays?: number;
}

export interface PaymentMethod {
  id: string;
  name: string;
  number: string;
  instructions: string;
}

export interface PremiumPlan {
  id: string;
  name: string; // e.g., '30 Days Premium', '6 Months VIP Premium'
  price: number; // e.g., 200, 1000
  durationDays: number; // e.g., 30, 180
}

export interface AppSettings {
  appName: string;
  adultPin: string;
  supportActive: boolean;
  bkash: string;
  nagad: string;
  bank: string;
  paymentMethods?: PaymentMethod[];
  adminEmail?: string;
  adminPassword?: string;
  recName?: string;
  recMother?: string;
  recFather?: string;
  recBlood?: string;
  recDob?: string;
  recNid?: string;
  customCategories?: {
    Movies?: string[];
    Anime?: string[];
    Drama?: string[];
    Cartoon?: string[];
    Serial?: string[];
  };
  premiumPlans?: PremiumPlan[];
  // Popup configs
  popupEnabled?: boolean;
  popupTitle?: string;
  popupMessage?: string;
  popupImageUrl?: string;
  popupButtonText?: string;
  popupButtonLink?: string;
  popups?: PopupItem[];
  // Banner configs
  banners?: BannerItem[];
  autoBannerLimit?: number;
  autoBannerDays?: number;
  // Notification configs
  autoNotificationLimit?: number;
  // Social links configs
  socialLinks?: SocialLink[];
  bannerAnimationType?: string;
}

export interface SocialLink {
  id: string;
  platformName: string; // e.g. Telegram, Facebook
  linkName: string; // e.g. Official Channel, Help Group
  url: string;
  icon: string; // material icon name or lucide icon key
  createdAt?: number;
}

export interface PopupItem {
  id: string;
  title: string;
  message: string;
  imageUrl?: string;
  buttonText?: string;
  buttonLink?: string;
  redirectLink?: string;
  autoCloseDelay?: number; // In seconds
  isActive: boolean;
  createdAt: number;
}

export interface VisitorStat {
  label: string; // Daily, Weekly, or Monthly key
  visitors: number;
  revenue: number;
}

export interface UserProfile {
  uid: string;
  name: string;
  email: string;
  isPremium: boolean;
  favorites: string[]; // Content IDs
  pinVerified?: boolean;
  isAdmin?: boolean;
  premiumUntil?: number | null;
  password?: string;
}

export const SLIDER_ANIMATIONS: Record<string, {
  name: string;
  banglaName: string;
  initial: any;
  animate: any;
  exit: any;
  transition?: any;
}> = {
  fade: {
    name: 'Fade Out & In',
    banglaName: 'সাধারণ ফেড ইন-আউট',
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.8, ease: 'easeInOut' }
  },
  slideLeft: {
    name: 'Slide Right to Left',
    banglaName: 'ডান থেকে বামে স্লাইড',
    initial: { x: '100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '-100%', opacity: 0 },
    transition: { type: 'spring', damping: 22, stiffness: 120 }
  },
  slideRight: {
    name: 'Slide Left to Right',
    banglaName: 'বাম থেকে ডানে স্লাইড',
    initial: { x: '-100%', opacity: 0 },
    animate: { x: 0, opacity: 1 },
    exit: { x: '100%', opacity: 0 },
    transition: { type: 'spring', damping: 22, stiffness: 120 }
  },
  slideUp: {
    name: 'Slide Bottom to Top',
    banglaName: 'নিচ থেকে উপরে স্লাইড',
    initial: { y: '100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '-100%', opacity: 0 },
    transition: { type: 'spring', damping: 22, stiffness: 120 }
  },
  slideDown: {
    name: 'Slide Top to Bottom',
    banglaName: 'উপর থেকে নিচে স্লাইড',
    initial: { y: '-100%', opacity: 0 },
    animate: { y: 0, opacity: 1 },
    exit: { y: '100%', opacity: 0 },
    transition: { type: 'spring', damping: 22, stiffness: 120 }
  },
  zoomInOut: {
    name: 'Scale Zoom In & Out',
    banglaName: 'জুম ইন ও জুম আউট',
    initial: { scale: 0.82, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 1.15, opacity: 0 },
    transition: { duration: 0.65, ease: 'easeOut' }
  },
  scaleBlurShift: {
    name: 'Blur & Zoom Out Focus',
    banglaName: 'ঝাপসা থেকে ফোকাস জুম আউট',
    initial: { filter: 'blur(15px)', scale: 1.15, opacity: 0 },
    animate: { filter: 'blur(0px)', scale: 1, opacity: 1 },
    exit: { filter: 'blur(15px)', scale: 0.9, opacity: 0 },
    transition: { duration: 0.8, ease: 'easeInOut' }
  },
  slowPan: {
    name: 'Cinematic Pan & Scale',
    banglaName: 'সিনেমেটিক স্লো প্যান ও জুম',
    initial: { scale: 1.25, opacity: 0 },
    animate: { scale: 1.02, opacity: 1 },
    exit: { scale: 1, opacity: 0 },
    transition: { duration: 2.2, ease: 'easeOut' }
  },
  flipLeft: {
    name: '3D Flip Card Left',
    banglaName: '৩ডি ফ্লিপ লেফট',
    initial: { rotateY: 92, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: -92, opacity: 0 },
    transition: { duration: 0.75, ease: 'easeInOut' }
  },
  flipRight: {
    name: '3D Flip Card Right',
    banglaName: '৩ডি ফ্লিপ রাইট',
    initial: { rotateY: -92, opacity: 0 },
    animate: { rotateY: 0, opacity: 1 },
    exit: { rotateY: 92, opacity: 0 },
    transition: { duration: 0.75, ease: 'easeInOut' }
  },
  flipUp: {
    name: '3D Flip Card Up',
    banglaName: '৩ডি ফ্লিপ আপ',
    initial: { rotateX: -92, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: 92, opacity: 0 },
    transition: { duration: 0.75, ease: 'easeInOut' }
  },
  flipDown: {
    name: '3D Flip Card Down',
    banglaName: '৩ডি ফ্লিপ ডাউন',
    initial: { rotateX: 92, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    exit: { rotateX: -92, opacity: 0 },
    transition: { duration: 0.75, ease: 'easeInOut' }
  },
  perspectiveDrop: {
    name: '3D Perspective Scale Out',
    banglaName: '৩ডি পার্সপেক্টিভ স্কেল ড্রপ',
    initial: { scale: 1.4, opacity: 0, rotateX: 8 },
    animate: { scale: 1, opacity: 1, rotateX: 0 },
    exit: { scale: 0.65, opacity: 0, rotateX: -8 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  },
  glitchStretch: {
    name: 'Glitch Energy Stretch',
    banglaName: 'গ্লিচ এনার্জি স্ট্রেইচ',
    initial: { scaleY: 0, opacity: 0 },
    animate: { scaleY: 1, opacity: 1 },
    exit: { scaleY: 0, opacity: 0 },
    transition: { duration: 0.45, ease: 'easeOut' }
  },
  skewLeft: {
    name: 'Skew Swipe Diagonal Left',
    banglaName: 'তেরছা ডান-বাম সোয়াইপ',
    initial: { x: '100%', skewX: -12, opacity: 0 },
    animate: { x: 0, skewX: 0, opacity: 1 },
    exit: { x: '-100%', skewX: 12, opacity: 0 },
    transition: { duration: 0.65, ease: 'easeInOut' }
  },
  skewRight: {
    name: 'Skew Swipe Diagonal Right',
    banglaName: 'তেরছা বাম-ডান সোয়াইপ',
    initial: { x: '-100%', skewX: 12, opacity: 0 },
    animate: { x: 0, skewX: 0, opacity: 1 },
    exit: { x: '100%', skewX: -12, opacity: 0 },
    transition: { duration: 0.65, ease: 'easeInOut' }
  },
  splitExpand: {
    name: 'Horizontal Curtain Split',
    banglaName: 'পর্দা খোলার ম্যাজিক',
    initial: { scaleX: 0.3, opacity: 0 },
    animate: { scaleX: 1, opacity: 1 },
    exit: { scaleX: 0.3, opacity: 0 },
    transition: { duration: 0.65, ease: 'backOut' }
  },
  vortexSpin: {
    name: 'Vortex Galactic Spin',
    banglaName: 'ঘূর্ণি গ্যালাক্সি স্পিন',
    initial: { rotate: -120, scale: 0.1, opacity: 0 },
    animate: { rotate: 0, scale: 1, opacity: 1 },
    exit: { rotate: 120, scale: 0.1, opacity: 0 },
    transition: { duration: 0.8, ease: 'easeInOut' }
  },
  whisperSlide: {
    name: 'Whisper Soft Motion',
    banglaName: 'হালকা উইস্পার মোশন',
    initial: { x: '25%', filter: 'blur(8px)', opacity: 0 },
    animate: { x: 0, filter: 'blur(0px)', opacity: 1 },
    exit: { x: '-25%', filter: 'blur(8px)', opacity: 0 },
    transition: { duration: 0.7, ease: 'easeOut' }
  },
  bounceSpring: {
    name: 'Elastic Bounce Animation',
    banglaName: 'ইলাস্টিক বাউন্স অ্যানিমেশন',
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    exit: { scale: 0.5, opacity: 0 },
    transition: { type: 'spring', damping: 11, stiffness: 110 }
  }
};
