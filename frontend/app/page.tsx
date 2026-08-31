'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Send, Map, Bot, Loader2, Sparkles, Plane, History, MapPin, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import dynamic from 'next/dynamic';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Dynamically import Leaflet map component with SSR disabled
const MapComponent = dynamic(() => import('@/components/MapComponent'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#8B4513]/5 text-[#8B4513] font-medium text-sm animate-pulse rounded-2xl border border-[#8B4513]/10">
      Loading Interactive Map...
    </div>
  )
});

const BACKGROUNDS = [
  'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?auto=format&fit=crop&w=2000&q=80',
  'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=2000&q=80'
];

const COORDINATES: Record<string, [number, number]> = {
  "goa": [15.2993, 74.1240],
  "manali": [32.2396, 77.1887],
  "jaipur": [26.9124, 75.7873],
  "kerala": [10.8505, 76.2711],
  "sikkim": [27.5330, 88.5122],
  "andaman": [11.7401, 92.6586],
  "udaipur": [24.5854, 73.7125],
  "agra": [27.1767, 78.0081],
  "rishikesh": [30.0869, 78.2676],
  "darjeeling": [27.0410, 88.2627],
  "kyoto": [35.0116, 135.7681],
  "shimla": [31.1048, 77.1734],
  "ooty": [11.4102, 76.6950],
  "ladakh": [34.1526, 77.5771],
  "paris": [48.8566, 2.3522],
  "tokyo": [35.6764, 139.6500],
  "london": [51.5074, -0.1278],
  "new york": [40.7128, -74.0060],
  "rome": [41.9028, 12.4964],
  "bali": [-8.4095, 115.1889],
  "maldives": [3.2028, 73.2207],
  "dubai": [25.2048, 55.2708],
  "singapore": [1.3521, 103.8198],
  "bangkok": [13.7563, 100.5018],
  "sydney": [-33.8688, 151.2093],
  "barcelona": [41.3851, 2.1734],
  "amsterdam": [52.3676, 4.9041],
  "cape town": [-33.9249, 18.4241],
  "cairo": [30.0444, 31.2357],
  "venice": [45.4408, 12.3155]
};

const DESTINATION_NAMES: Record<string, string> = {
  "goa": "Goa",
  "manali": "Manali",
  "jaipur": "Jaipur",
  "kerala": "Kerala",
  "sikkim": "Sikkim",
  "andaman": "Andaman",
  "udaipur": "Udaipur",
  "agra": "Agra",
  "rishikesh": "Rishikesh",
  "darjeeling": "Darjeeling",
  "kyoto": "Kyoto",
  "shimla": "Shimla",
  "ooty": "Ooty",
  "ladakh": "Ladakh",
  "paris": "Paris",
  "tokyo": "Tokyo",
  "london": "London",
  "new york": "New York",
  "rome": "Rome",
  "bali": "Bali",
  "maldives": "Maldives",
  "dubai": "Dubai",
  "singapore": "Singapore",
  "bangkok": "Bangkok",
  "sydney": "Sydney",
  "barcelona": "Barcelona",
  "amsterdam": "Amsterdam",
  "cape town": "Cape Town",
  "cairo": "Cairo",
  "venice": "Venice"
};

function extractCandidateDestination(text: string): string | null {
  const patterns = [
    /\btrip\s+to\s+([a-zA-Z\s]+)/i,
    /\btravel\s+to\s+([a-zA-Z\s]+)/i,
    /\bgo\s+to\s+([a-zA-Z\s]+)/i,
    /\bvisit\s+([a-zA-Z\s]+)/i,
    /\bexplore\s+([a-zA-Z\s]+)/i,
    /\bto\s+([a-zA-Z\s]+)/i,
    /\bin\s+([a-zA-Z\s]+)/i
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      let candidate = match[1].trim();
      const stopWords = [
        "and", "under", "with", "my", "for", "budget", "on", "a", "an", "the", "from", 
        "stay", "i", "is", "only", "this", "that", "trip", "vacation"
      ];
      
      const parts = candidate.split(/\s+/);
      const cleanParts: string[] = [];
      for (const part of parts) {
        if (stopWords.includes(part.toLowerCase())) {
          break;
        }
        cleanParts.push(part);
      }
      
      if (cleanParts.length > 0) {
        return cleanParts.join(" ");
      }
    }
  }

  // Common backup cities list to detect direct single words
  const commonCities = [
    "goa", "manali", "jaipur", "kerala", "sikkim", "andaman", "udaipur",
    "agra", "rishikesh", "darjeeling", "kyoto", "shimla", "ooty", "ladakh",
    "paris", "tokyo", "london", "new york", "rome", "bali", "maldives",
    "dubai", "singapore", "bangkok", "sydney", "barcelona", "amsterdam",
    "cape town", "cairo", "venice", "delhi", "mumbai", "kolkata", "chennai", "bangalore"
  ];
  const cleanedText = text.toLowerCase();
  for (const city of commonCities) {
    if (cleanedText.includes(city)) {
      return city;
    }
  }

  return null;
}

export default function PlannerUI() {
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState<{role: string, content: string, tasks?: string[]}[]>([]);
  const [loading, setLoading] = useState(false);
  const [tripName, setTripName] = useState<string | null>(null);
  const [bgImage, setBgImage] = useState(BACKGROUNDS[0]);
  const [isClient, setIsClient] = useState(false);
  const [trips, setTrips] = useState<any[]>([]);
  const [currentTripId, setCurrentTripId] = useState<string | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [deletingTripId, setDeletingTripId] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);
  
  // Auth state
  const [user, setUser] = useState<string | null>(null);
  const [authUsername, setAuthUsername] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  // Map state
  const [currentCoordinates, setCurrentCoordinates] = useState<[number, number] | null>(null);

  const fetchTrips = async (usernameToUse?: string) => {
    const activeUser = usernameToUse || user;
    if (!activeUser) return;
    try {
      const response = await axios.get(`${API_URL}/api/trips?username=${activeUser}`);
      setTrips(response.data);
    } catch (error) {
      console.error('Error fetching trips:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    setBgImage(BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]);
    const savedUser = localStorage.getItem('travelsmart_user');
    if (savedUser) {
      setUser(savedUser);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchTrips(user);
    } else {
      setTrips([]);
    }
  }, [user]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (!authUsername.trim() || !authPassword.trim()) {
      setAuthError('Please fill in all fields');
      return;
    }
    
    const endpoint = isRegistering ? 'register' : 'login';
    try {
      const response = await axios.post(`${API_URL}/api/auth/${endpoint}`, {
        username: authUsername.trim(),
        password: authPassword.trim()
      });
      
      const loggedUser = response.data.username;
      localStorage.setItem('travelsmart_user', loggedUser);
      setUser(loggedUser);
      setAuthUsername('');
      setAuthPassword('');
    } catch (error: any) {
      console.error(error);
      const msg = error.response?.data?.detail || 'Authentication failed. Please try again.';
      setAuthError(msg);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('travelsmart_user');
    setUser(null);
    handleNewChat();
  };

  const handleSelectTrip = async (id: string) => {
    try {
      const response = await axios.get(`${API_URL}/api/trips/${id}`);
      const trip = response.data;
      setMessages(trip.messages);
      setCurrentTripId(trip.id);
      setTripName(trip.name);
      setCurrentCoordinates(trip.coordinates || null);
    } catch (error) {
      console.error('Error fetching trip details:', error);
    }
  };

  const handleDeleteTripDirect = async (id: string) => {
    try {
      await axios.delete(`${API_URL}/api/trips/${id}`);
      setTrips(prev => prev.filter(t => t.id !== id));
      if (currentTripId === id) {
        handleNewChat();
      }
      setDeletingTripId(null);
    } catch (error) {
      console.error('Error deleting trip:', error);
    }
  };

  const handleRenameTrip = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    try {
      await axios.put(`${API_URL}/api/trips/${id}`, { name: newName });
      setTrips(prev => prev.map(t => t.id === id ? { ...t, name: newName } : t));
      if (currentTripId === id) {
        setTripName(newName);
      }
      setEditingTripId(null);
    } catch (error) {
      console.error('Error renaming trip:', error);
    }
  };

  const handleSend = async () => {
    if (!query.trim() || !user) return;
    
    const userMsg = query;
    const updatedMessages = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setQuery('');
    setLoading(true);

    // Immediate client-side destination extraction and interactive map pan
    const candidate = extractCandidateDestination(userMsg);
    let tempCoordinates = currentCoordinates;
    let tempTripName = tripName;
    let detectedName = 'Unknown';

    if (candidate) {
      const lowerCandidate = candidate.toLowerCase().trim();
      const capitalize = (s: string) => s.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      detectedName = DESTINATION_NAMES[lowerCandidate] || capitalize(candidate);
      tempTripName = `Trip to ${detectedName}`;
      setTripName(tempTripName);

      if (COORDINATES[lowerCandidate]) {
        console.log(`[Client Map] Zero-latency map pan to "${detectedName}":`, COORDINATES[lowerCandidate]);
        tempCoordinates = COORDINATES[lowerCandidate];
        setCurrentCoordinates(tempCoordinates);
      } else {
        console.log(`[Client Map] Querying Nominatim for "${candidate}"...`);
        // We trigger an async Nominatim call but continue sending the API query in parallel.
        // Once the coordinates are returned, we update the map coordinates dynamically.
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(candidate)}&limit=1`, {
          headers: {
            "User-Agent": "TravelSmartAI-BrowserApp"
          }
        })
        .then(res => res.json())
        .then(data => {
          if (data && data.length > 0) {
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            console.log(`[Client Map] Geocoded "${candidate}" to: [${lat}, ${lon}]`);
            setCurrentCoordinates([lat, lon]);
            // Also update the database save payload if possible
            if (currentTripId) {
              axios.post(`${API_URL}/api/trips`, {
                id: currentTripId,
                name: tempTripName,
                destination: detectedName,
                messages: [...updatedMessages], // We will let the final message save it, or do a silent patch
                username: user,
                coordinates: [lat, lon]
              }).catch(err => console.error('[Client Map] Failed to update coords in backend:', err));
            }
          }
        })
        .catch(err => {
          console.error(`[Client Map] Nominatim geocoding failed:`, err);
        });
      }
    }

    try {
      const currentDest = tempTripName ? tempTripName.replace(/^Trip to\s+/i, "") : null;
      const response = await axios.post('/api/chat', {
        message: userMsg,
        history: messages,
        currentDestination: currentDest,
        currentCoordinates: tempCoordinates
      });
      
      const data = response.data;
      const aiMsg = {
        role: 'ai',
        content: data.content,
        tasks: data.tasks_executed
      };
      const finalMessages = [...updatedMessages, aiMsg];
      setMessages(finalMessages);

      let destToUse = data.destination || (detectedName !== 'Unknown' ? detectedName : 'Unknown');
      let coordsToUse = data.coordinates || tempCoordinates || null;
      if (coordsToUse) {
        setCurrentCoordinates(coordsToUse);
      }

      let nameToUse = tempTripName || `Trip to ${destToUse}`;
      if (data.destination && data.destination !== 'Unknown') {
        nameToUse = `Trip to ${data.destination}`;
        setTripName(nameToUse);
      } else if (!currentTripId && nameToUse) {
        setTripName(nameToUse);
      }

      const saveResponse = await axios.post(`${API_URL}/api/trips`, {
        id: currentTripId || undefined,
        name: nameToUse,
        destination: destToUse,
        messages: finalMessages,
        username: user,
        coordinates: coordsToUse
      });

      const savedTrip = saveResponse.data;
      if (!currentTripId) {
        setCurrentTripId(savedTrip.id);
      }
      fetchTrips(user);
    } catch (error: any) {
      console.error(error);
      const errMsg = error.response?.data?.error || "TravelSmart AI is temporarily unavailable. Please make sure the AI service is running and try again.";
      setMessages(prev => [...prev, { role: 'ai', content: errMsg }]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setTripName(null);
    setCurrentTripId(null);
    setCurrentCoordinates(null);
    setBgImage(BACKGROUNDS[Math.floor(Math.random() * BACKGROUNDS.length)]);
  };

  if (!isClient) {
    return <div className="h-screen h-[100dvh] overflow-hidden bg-[#F5F5DC]" />;
  }

  // Render Login / Registration card if unauthenticated
  if (!user) {
    return (
      <div className="h-screen h-[100dvh] overflow-hidden flex items-center justify-center font-[Arial] relative">
        <div 
          className="fixed inset-0 z-0 bg-cover bg-center transition-all duration-1000"
          style={{ backgroundImage: `url(${bgImage})` }}
        />
        <div className="fixed inset-0 z-0 bg-white/40 backdrop-blur-[2px]" />
        
        <Card className="w-full max-w-md p-8 bg-[#F5F5DC]/90 backdrop-blur-2xl border border-[#8B4513]/20 rounded-3xl shadow-2xl z-10 text-[#4A2F1D]">
          <div className="flex flex-col items-center mb-6">
            <span className="text-3xl font-bold text-[#5c4033] tracking-widest uppercase">
              Travel
            </span>
            <span className="text-sm font-light text-[#8B4513] tracking-[0.3em] uppercase">
              Smart AI
            </span>
            <p className="text-xs text-[#8B4513] font-semibold mt-3 uppercase tracking-wider">
              {isRegistering ? 'Create your travel account' : 'Sign in to start planning'}
            </p>
          </div>
          
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#8B4513] uppercase tracking-wider mb-1 px-1">
                Username
              </label>
              <Input
                type="text"
                placeholder="E.g., traveler123"
                value={authUsername}
                onChange={e => setAuthUsername(e.target.value)}
                className="bg-white/60 border-[#8B4513]/20 focus-visible:ring-[#8B4513] rounded-2xl h-12 text-[#4A2F1D]"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-[#8B4513] uppercase tracking-wider mb-1 px-1">
                Password
              </label>
              <Input
                type="password"
                placeholder="••••••••"
                value={authPassword}
                onChange={e => setAuthPassword(e.target.value)}
                className="bg-white/60 border-[#8B4513]/20 focus-visible:ring-[#8B4513] rounded-2xl h-12 text-[#4A2F1D]"
              />
            </div>
            
            {authError && (
              <p className="text-sm text-red-700 font-semibold px-1">{authError}</p>
            )}
            
            <Button
              type="submit"
              className="w-full h-12 bg-[#8B4513] hover:bg-[#6e360f] text-[#F5F5DC] rounded-2xl font-bold shadow-lg shadow-[#8B4513]/30 transition-transform active:scale-95"
            >
              {isRegistering ? 'Register' : 'Sign In'}
            </Button>
          </form>
          
          <div className="mt-6 text-center text-sm">
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setAuthError(null);
              }}
              className="text-[#8B4513] hover:underline font-semibold"
            >
              {isRegistering ? 'Already have an account? Sign In' : "Don't have an account? Register now"}
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen h-[100dvh] overflow-hidden flex font-[Arial] bg-[#F5F5DC]">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 z-0 transition-all duration-1000 ease-in-out bg-cover bg-center"
        style={{ backgroundImage: `url(${bgImage})` }}
      />
      <div className="fixed inset-0 z-0 bg-white/40 backdrop-blur-[2px]" />

      {/* Sidebar */}
      <aside className="w-80 bg-[#F5F5DC]/80 backdrop-blur-2xl border-r border-[#8B4513]/20 z-10 flex flex-col h-screen shrink-0 text-[#4A2F1D] shadow-2xl">
        <div className="p-6 h-24 flex items-center gap-4 border-b border-[#8B4513]/20 shrink-0">
          <img 
            src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=100&q=80" 
            alt="TravelSmart Logo" 
            className="w-12 h-12 rounded-full object-cover border border-[#8B4513]/50 shadow-md"
          />
          <div className="flex flex-col">
            <span className="text-xl font-bold text-[#5c4033] tracking-widest uppercase">
              Travel
            </span>
            <span className="text-sm font-light text-[#8B4513] tracking-[0.3em] uppercase">
              Smart
            </span>
          </div>
        </div>
        
        <div className="flex-1 p-4 overflow-y-auto min-h-0">
          <Button 
            onClick={handleNewChat}
            variant="ghost" 
            className="w-full justify-start gap-2 bg-[#8B4513]/10 hover:bg-[#8B4513]/20 text-[#5c4033] mb-6 border border-[#8B4513]/20 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Trip
          </Button>

          <div className="text-xs font-semibold text-[#8B4513] uppercase tracking-wider mb-3 px-2">
            Your Trips
          </div>
          
          <div className="flex flex-col gap-2">
            {trips.length > 0 ? (
              trips.map((trip) => (
                <div 
                  key={trip.id}
                  onClick={() => handleSelectTrip(trip.id)}
                  className={`group flex items-center justify-between px-3 py-3 rounded-xl border cursor-pointer transition-all duration-200 shadow-sm ${
                    currentTripId === trip.id 
                      ? 'bg-[#8B4513]/15 text-[#5c4033] border-[#8B4513]/40 font-medium' 
                      : 'bg-[#8B4513]/5 hover:bg-[#8B4513]/10 text-[#5c4033]/80 border-[#8B4513]/10'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <MapPin className="w-5 h-5 text-[#8B4513] shrink-0" />
                    {editingTripId === trip.id ? (
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleRenameTrip(trip.id, editingName);
                          if (e.key === 'Escape') setEditingTripId(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-white/90 border border-[#8B4513]/30 rounded px-2 py-0.5 text-sm font-medium w-full text-[#4A2F1D] focus:outline-none focus:ring-1 focus:ring-[#8B4513]"
                        autoFocus
                      />
                    ) : (
                      <span className="truncate text-sm font-medium">{trip.name}</span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    {editingTripId === trip.id ? (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRenameTrip(trip.id, editingName);
                          }}
                          className="p-1 hover:bg-black/5 rounded text-green-700 transition-colors"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTripId(null);
                          }}
                          className="p-1 hover:bg-black/5 rounded text-red-600 transition-colors"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : deletingTripId === trip.id ? (
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-red-600 font-bold mr-0.5">Delete?</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteTripDirect(trip.id);
                          }}
                          className="p-1 hover:bg-red-50 rounded text-red-600 transition-colors"
                          title="Confirm Delete"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTripId(null);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500 transition-colors"
                          title="Cancel"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingTripId(trip.id);
                            setEditingName(trip.name);
                            setDeletingTripId(null);
                          }}
                          className="p-1 hover:bg-black/5 rounded text-[#8B4513]/70 hover:text-[#8B4513] transition-colors"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingTripId(trip.id);
                            setEditingTripId(null);
                          }}
                          className="p-1 hover:bg-black/5 rounded text-red-600/70 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-sm text-[#8B4513]/70 px-2 italic">
                Start a conversation to plan a trip.
              </div>
            )}
          </div>
        </div>

        {/* User profile & Logout */}
        <div className="p-4 border-t border-[#8B4513]/20 flex items-center justify-between shrink-0 bg-[#8B4513]/5">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#8B4513]/15 flex items-center justify-center font-bold text-[#5c4033] uppercase border border-[#8B4513]/30 text-xs">
              {user.slice(0, 2)}
            </div>
            <span className="truncate text-sm font-semibold text-[#5c4033]">{user}</span>
          </div>
          <Button 
            onClick={handleLogout}
            variant="ghost" 
            size="sm" 
            className="text-xs font-semibold text-red-700 hover:bg-red-50 hover:text-red-900 rounded-lg p-2"
          >
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex z-10 overflow-hidden p-4 md:p-6 gap-6 min-w-0">
        {/* Left: Chat Area (2/3 width) */}
        <div className="flex-[2] flex flex-col min-w-0 h-full">
          <Card className="flex-1 flex flex-col overflow-hidden shadow-2xl border border-[#8B4513]/20 rounded-3xl bg-[#F5F5DC]/80 backdrop-blur-2xl text-[#4A2F1D] min-h-0">
            {/* Scrollable messages */}
            <div className="flex-1 overflow-y-auto p-6 min-h-0">
              <div className="flex flex-col gap-6">
                {messages.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-[#5c4033] mt-32">
                    <div className="w-32 h-[1px] bg-[#8B4513]/30 mb-8" />
                    <h2 className="text-5xl font-normal mb-6 tracking-wide text-center text-[#4A2F1D]">Where to next?</h2>
                    <p className="text-sm text-[#8B4513] text-center max-w-lg leading-relaxed uppercase tracking-[0.2em] font-semibold">
                      Curated journeys &amp; bespoke itineraries
                    </p>
                    <div className="w-32 h-[1px] bg-[#8B4513]/30 mt-8" />
                  </div>
                )}

                {messages.map((msg, i) => (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    key={i} 
                    className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'ai' && (
                      <img 
                        src="https://images.unsplash.com/photo-1524661135-423995f22d0b?auto=format&fit=crop&w=100&q=80" 
                        alt="AI Avatar" 
                        className="w-10 h-10 rounded-full object-cover shrink-0 mt-1 shadow-md border border-[#8B4513]/30"
                      />
                    )}
                    
                    <div className={`max-w-[85%] ${msg.role === 'user' ? 'bg-[#8B4513] text-[#F5F5DC] rounded-3xl rounded-tr-sm px-6 py-4 shadow-xl' : ''}`}>
                      {msg.role === 'user' ? (
                        <p className="text-[15px] leading-relaxed">{msg.content}</p>
                      ) : (
                        <div className="flex flex-col gap-4">
                          <div className="bg-[#F5F5DC]/90 backdrop-blur-xl border border-[#8B4513]/20 rounded-2xl p-6 shadow-lg prose prose-stone max-w-none font-[Arial] text-[#4A2F1D] text-[15px] leading-relaxed markdown-body">
                            <ReactMarkdown>
                              {msg.content}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}

                {loading && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#8B4513]/10 border border-[#8B4513]/20 flex items-center justify-center shrink-0 shadow-md">
                      <Loader2 className="w-5 h-5 text-[#8B4513] animate-spin" />
                    </div>
                    <div className="bg-[#F5F5DC]/90 backdrop-blur-xl border border-[#8B4513]/20 rounded-2xl px-6 py-4 text-[#5c4033] text-sm flex items-center gap-2 shadow-lg">
                      Our agents are analyzing the best options for you...
                    </div>
                  </motion.div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </div>

            {/* Input bar - always pinned to bottom */}
            <div className="p-4 bg-[#F5F5DC]/70 backdrop-blur-xl border-t border-[#8B4513]/20 shrink-0">
              <div className="relative flex items-center">
                <textarea
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  rows={1}
                  placeholder="E.g., Plan a 5-day trip to Kyoto under $2000"
                  className="w-full pr-14 min-h-[56px] max-h-[160px] py-4 rounded-3xl bg-white/50 border border-[#8B4513]/20 focus:outline-none focus:border-[#8B4513] focus:ring-1 focus:ring-[#8B4513] text-base px-6 shadow-inner text-[#4A2F1D] placeholder:text-[#8B4513]/60 font-[Arial] resize-none overflow-y-auto align-middle"
                />
                <Button 
                  onClick={handleSend}
                  disabled={loading || !query.trim()}
                  size="icon"
                  className="absolute right-2 h-10 w-10 rounded-full bg-[#8B4513] hover:bg-[#6e360f] text-[#F5F5DC] shadow-lg shadow-[#8B4513]/30 transition-transform hover:scale-105 z-10"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Right: Map Area (1/3 width, hidden on mobile) */}
        <div className="hidden lg:flex flex-[1] flex-col min-w-[320px] max-w-[450px] h-full relative">
          <Card className="flex-1 flex flex-col p-4 bg-[#F5F5DC]/85 backdrop-blur-2xl border border-[#8B4513]/20 rounded-3xl shadow-2xl">
            <div className="flex items-center justify-between mb-3 px-1">
              <div className="flex items-center gap-2">
                <Map className="w-5 h-5 text-[#8B4513]" />
                <span className="font-bold text-xs text-[#5c4033] uppercase tracking-wider">
                  Interactive Map
                </span>
              </div>
              {tripName && (
                <span className="text-xs bg-[#8B4513]/10 text-[#8B4513] font-bold px-2.5 py-0.5 rounded-full truncate max-w-[150px]">
                  {tripName.replace("Trip to ", "")}
                </span>
              )}
            </div>
            
            <div className="flex-1 relative min-h-0 rounded-2xl overflow-hidden shadow-inner border border-[#8B4513]/10">
              <MapComponent coordinates={currentCoordinates} destinationName={tripName} />
            </div>
            
            {/* Map metadata */}
            <div className="mt-4 p-3 bg-white/50 rounded-xl border border-[#8B4513]/10 text-xs text-[#8B4513] space-y-1">
              <p className="font-semibold text-[#5c4033]">💡 Interactive Travel Guide</p>
              <p className="leading-relaxed">
                Map centers automatically when you search a place. Click the marker to view destination details.
              </p>
            </div>
          </Card>
        </div>
      </main>
    </div>
  );
}
