import type {
  AppUser,
  Badge,
  DailyChallenge,
  FunFact,
  Habit,
  Ingredient,
  LeaderboardEntry,
  Post,
  ScoredRecipe,
} from '../types';

const API_BASE_URL = (process.env.EXPO_PUBLIC_API_BASE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

export class ApiError extends Error {
  status: number;
  payload: unknown;

  constructor(message: string, status: number, payload: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.payload = payload;
  }
}

type RequestOptions = RequestInit & { skipJsonHeader?: boolean };

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = options.skipJsonHeader
    ? options.headers
    : {
        'Content-Type': 'application/json',
        ...(options.headers ?? {}),
      };

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const contentType = res.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');
  const payload = isJson ? await res.json() : await res.text();

  if (!res.ok) {
    const message =
      typeof payload === 'object' && payload && 'error' in payload
        ? String((payload as { error: string }).error)
        : `Request failed (${res.status})`;
    throw new ApiError(message, res.status, payload);
  }

  return payload as T;
}

function imageFilePart(uri: string) {
  const name = uri.split('/').pop() ?? `proof-${Date.now()}.jpg`;
  const ext = name.includes('.') ? name.split('.').pop()?.toLowerCase() : 'jpg';
  const type = ext ? `image/${ext}` : 'image/jpeg';
  return { uri, name, type };
}

export async function login(email: string, password: string) {
  return request<{ ok: boolean }>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(username: string, email: string, password: string) {
  return request<{ ok: boolean }>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, email, password }),
  });
}

export async function logout() {
  return request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' });
}

export async function getCurrentUser() {
  return request<{ user: AppUser | null }>('/api/auth/me');
}

export async function getHabits() {
  return request<Habit[]>('/api/habits');
}

export async function saveUserHabits(habitIds: number[], customTask?: string) {
  return request<{ ok: boolean }>('/api/user-habits', {
    method: 'POST',
    body: JSON.stringify({ habitIds, customTask }),
  });
}

export interface ChallengeResponse {
  challenges: DailyChallenge[];
  streak: number;
  week: { date: string; completed: boolean }[];
  coins: number;
}

export async function getChallenges() {
  return request<ChallengeResponse>('/api/challenges');
}

export async function uploadProofImage(uri: string) {
  const form = new FormData();
  form.append('file', imageFilePart(uri) as unknown as Blob);
  return request<{ url: string }>('/api/upload', {
    method: 'POST',
    body: form,
    skipJsonHeader: true,
  });
}

export async function completeChallenge(challengeId: number, imageUri: string) {
  const { url } = await uploadProofImage(imageUri);
  return request<{ ok: boolean; coins: number; streak: number }>(`/api/challenges/${challengeId}`, {
    method: 'PATCH',
    body: JSON.stringify({ proof_image_url: url }),
  });
}

export async function getFunFact() {
  return request<FunFact | null>('/api/fun-facts');
}

export async function getIngredients() {
  return request<Ingredient[]>('/api/ingredients');
}

export async function addIngredient(ingredientName: string) {
  return request<Ingredient>('/api/ingredients', {
    method: 'POST',
    body: JSON.stringify({ ingredient_name: ingredientName }),
  });
}

export async function updateIngredientQuantity(ingredientId: number, quantity: number) {
  return request<{ ok: boolean }>(`/api/ingredients/${ingredientId}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });
}

export async function removeIngredient(ingredientId: number) {
  return request<{ ok: boolean }>(`/api/ingredients/${ingredientId}`, {
    method: 'DELETE',
  });
}

export async function getRecipes(ingredients: string[], calorieLimit?: number) {
  const params = new URLSearchParams();
  params.set('ingredients', ingredients.join(','));
  if (typeof calorieLimit === 'number') params.set('calorieLimit', String(calorieLimit));

  return request<ScoredRecipe[]>(`/api/recipes?${params.toString()}`);
}

export async function getPosts() {
  return request<Post[]>('/api/posts');
}

export async function createPost(content: string, topic: string, anonymous: boolean) {
  return request<{ ok: boolean }>('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ content, topic, anonymous }),
  });
}

export interface Reply {
  reply_id: number;
  post_id: number;
  user_id: number;
  content: string;
  anonymous: number;
  created_at: string;
  username: string;
}

export async function getReplies(postId: number) {
  return request<Reply[]>(`/api/posts/${postId}/replies`);
}

export async function createReply(postId: number, content: string, anonymous: boolean) {
  return request<{ ok: boolean }>(`/api/posts/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content, anonymous }),
  });
}

export async function upvotePost(postId: number) {
  return request<{ upvotes: number }>(`/api/posts/${postId}/upvote`, {
    method: 'POST',
  });
}

export interface FriendRow {
  id: number;
  user_id_1: number;
  user_id_2: number;
  status: string;
  username_1: string;
  username_2: string;
}

export async function getLeaderboard() {
  return request<{ global: LeaderboardEntry[]; friends: LeaderboardEntry[]; currentUserId: number }>('/api/leaderboard');
}

export async function getFriends() {
  return request<FriendRow[]>('/api/friends');
}

export async function addFriend(targetUserId: number) {
  return request<{ ok: boolean }>('/api/friends', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });
}

export async function respondFriend(friendId: number, status: 'accepted' | 'rejected') {
  return request<{ ok: boolean }>(`/api/friends/${friendId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function searchUsers(query: string) {
  const q = encodeURIComponent(query);
  return request<{ id: number; username: string }[]>(`/api/users/search?q=${q}`);
}

export interface ProfileResponse {
  profile: AppUser;
  badges: Badge[];
  streak: number;
  unlocked_items: { item_type: string; item_value: string }[];
}

export async function getProfile() {
  return request<ProfileResponse>('/api/profile');
}

export async function updateProfile(payload: {
  height?: number | null;
  weight?: number | null;
  dietary_req?: string | null;
  banner_color?: string;
  banner_icon?: string;
  shown_in_leaderboard?: boolean;
}) {
  return request<{ ok: boolean }>('/api/profile', {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function unlockProfileItem(itemType: 'color' | 'icon', itemValue: string) {
  return request<{ ok: boolean; already_owned?: boolean; remaining_coins?: number }>('/api/profile/unlock', {
    method: 'POST',
    body: JSON.stringify({ item_type: itemType, item_value: itemValue }),
  });
}
