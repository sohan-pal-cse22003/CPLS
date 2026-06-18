export interface ProviderService {
  id: string;
  price: number | null;
}

export interface UserResponse {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'provider' | 'consumer';
  isBlocked: boolean;
  online: boolean;
  isApproved: boolean;
  otp?: string;
  rating: number;
  services?: ProviderService[];
}

export interface LoginResponse {
  success: boolean;
  accessToken: string;
  user: UserResponse;
}

export interface BookingFlatResponse {
  id: string;
  consumerId: string;
  consumerName: string;
  providerId: string | null;
  providerName: string;
  category: string | null;
  subcategoryId: string | null;
  subcategoryName: string;
  price: number;
  date: string;
  time: string;
  address: string;
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  rating: number;
  comment: string;
  otp: string | null;
}

export interface SearchSuggestionResponse {
  type: 'category' | 'subcategory';
  id: string;
  title: string;
  categoryId?: string;
  categoryName: string;
  price?: number;
  badge: string;
}

export interface ProviderListingResponse {
  id: string;
  name: string;
  rating: number;
  price: number;
  categoryId: string;
  serviceName: string;
}

export interface AdminStatsResponse {
  totalConsumers: number;
  totalProviders: number;
  pendingProviders: number;
  totalRevenue: number;
  totalBookings: number;
}
