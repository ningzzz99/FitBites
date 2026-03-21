import { Platform } from 'react-native';

// Change this to your computer's local IP when testing on a physical device
// e.g. 'http://192.168.1.100:3001'
const BASE_URL =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3001'  // Android emulator
    : 'http://localhost:3001'; // iOS simulator / web

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    credentials: 'include',
    ...options,
  });

  if (!res.ok) {
    let message = 'Request failed';
    try {
      const body = await res.json();
      message = body.error || message;
    } catch {}
    throw new ApiError(message, res.status);
  }

  return res.json();
}

// Auth
export const login = (email, password) =>
  request('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });

export const register = (username, email, password) =>
  request('/api/auth/register', { method: 'POST', body: JSON.stringify({ username, email, password }) });

export const logout = () => request('/api/auth/logout', { method: 'POST' });

export const getCurrentUser = () => request('/api/auth/me');

// Challenges
export const getChallenges = () => request('/api/challenges');

export const addCustomChallenge = (task) =>
  request('/api/challenges/custom', { method: 'POST', body: JSON.stringify({ task }) });

export const deleteCustomChallenge = (id) =>
  request(`/api/challenges/custom/${id}`, { method: 'DELETE' });

export const completeChallenge = async (challengeId, imageUri = null) => {
  return request(`/api/challenges/${challengeId}`, {
    method: 'PATCH',
    body: JSON.stringify({ proof_image_url: imageUri }),
  });
};

// Habits
export const getHabits = () => request('/api/habits');

export const saveUserHabits = (habitIds, customTask) =>
  request('/api/user-habits/save', {
    method: 'POST',
    body: JSON.stringify({ habitIds, customTask }),
  });

export const getUserHabits = () => request('/api/user-habits/current');

// Ingredients
export const getIngredients = () => request('/api/ingredients');

export const addIngredient = (ingredient_name) =>
  request('/api/ingredients', {
    method: 'POST',
    body: JSON.stringify({ ingredient_name }),
  });

export const updateIngredientQuantity = (id, quantity) =>
  request(`/api/ingredients/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ quantity }),
  });

export const removeIngredient = (id) =>
  request(`/api/ingredients/${id}`, { method: 'DELETE' });

// Recipes — TheMealDB (free tier)
const MEALDB = 'https://www.themealdb.com/api/json/v1/1';

export async function getMealsByIngredient(ingredient) {
  const query = ingredient.trim().replace(/\s+/g, '_');
  try {
    const res = await fetch(`${MEALDB}/filter.php?i=${encodeURIComponent(query)}`);
    if (!res.ok) return [];
    const data = await res.json();
    return data.meals || [];
  } catch {
    return [];
  }
}

export async function getMealById(id) {
  const res = await fetch(`${MEALDB}/lookup.php?i=${id}`);
  if (!res.ok) return null;
  const data = await res.json();
  return data.meals?.[0] ?? null;
}

// Posts
export const getPosts = () => request('/api/posts');

export const createPost = (content, anonymous) =>
  request('/api/posts', {
    method: 'POST',
    body: JSON.stringify({ content, anonymous }),
  });

export const upvotePost = (postId) =>
  request(`/api/posts/${postId}/upvote`, { method: 'POST' });

export const getReplies = (postId) => request(`/api/posts/${postId}/replies`);

export const createReply = (postId, content, anonymous) =>
  request(`/api/posts/${postId}/replies`, {
    method: 'POST',
    body: JSON.stringify({ content, anonymous }),
  });

// Leaderboard
export const getLeaderboard = () => request('/api/leaderboard');

// Friends
export const getFriends = () => request('/api/friends');

export const addFriend = (targetUserId) =>
  request('/api/friends', {
    method: 'POST',
    body: JSON.stringify({ targetUserId }),
  });

export const respondFriend = (friendId, status) =>
  request(`/api/friends/${friendId}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });

// Users search
export const searchUsers = (q) => request(`/api/leaderboard/user-search?q=${encodeURIComponent(q)}`);

// Profile
export const getProfile = () => request('/api/profile');

export const updateProfile = (data) =>
  request('/api/profile', { method: 'PATCH', body: JSON.stringify(data) });

export const unlockProfileItem = (item_type, item_value) =>
  request('/api/profile/unlock', {
    method: 'POST',
    body: JSON.stringify({ item_type, item_value }),
  });

// Fun facts — API Ninjas (called directly from client)
const API_NINJAS_KEY = '';

export async function getFunFact() {
  try {
    const res = await fetch('https://api.api-ninjas.com/v1/facts', {
      headers: { 'X-Api-Key': API_NINJAS_KEY },
    });
    if (!res.ok) return null;
    const data = await res.json();
    const fact = data?.[0]?.fact;
    return fact ? { content: fact } : null;
  } catch {
    return null;
  }
}
