import { NextResponse } from 'next/server';

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

const TYPOS: Record<string, string> = {
  "kerla": "kerala",
  "goaa": "goa",
  "ny": "new york",
  "nyc": "new york",
  "new york city": "new york",
  "capetown": "cape town",
  "venise": "venice",
  "barca": "barcelona"
};

function detectDestination(text: string): string | null {
  const cleaned = text.toLowerCase().trim();
  
  // Apply typo correction
  let processed = cleaned;
  for (const [typo, correction] of Object.entries(TYPOS)) {
    if (processed.includes(typo)) {
      processed = processed.replace(typo, correction);
    }
  }

  // Find direct match
  for (const city of Object.keys(COORDINATES)) {
    if (processed.includes(city)) {
      return city;
    }
  }

  // Check sub-words
  const words = processed.split(/\s+/).filter(w => w.length > 3);
  for (const w of words) {
    for (const city of Object.keys(COORDINATES)) {
      if (city.includes(w)) {
        return city;
      }
    }
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { message, history = [], currentDestination, currentCoordinates } = body;

    if (!message) {
      return NextResponse.json({ error: "Message is required" }, { status: 400 });
    }

    // 1. Detect if a new destination is being requested
    const matchedCity = detectDestination(message);
    
    let contextPlan = "";
    let fetchedDest = currentDestination || null;
    let fetchedCoords = currentCoordinates || null;
    const tasksExecuted: string[] = [];

    const destToQuery = matchedCity || (currentDestination ? currentDestination.toLowerCase().trim() : null);
    
    if (destToQuery && COORDINATES[destToQuery]) {
      const displayCity = DESTINATION_NAMES[destToQuery];
      fetchedDest = displayCity;
      fetchedCoords = COORDINATES[destToQuery];
      
      if (matchedCity) {
        tasksExecuted.push(`Destination detected: ${displayCity}`);
      } else {
        tasksExecuted.push(`Context maintained: ${displayCity}`);
      }
      
      try {
        const backendRes = await fetch("http://localhost:8000/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: destToQuery })
        });
        
        if (backendRes.ok) {
          const backendData = await backendRes.json();
          if (backendData.plan) {
            contextPlan = backendData.plan;
            tasksExecuted.push("Retrieved TravelSmart weather, hotels, and crowd analytics");
          }
        }
      } catch (error) {
        console.error("Failed to query FastAPI backend:", error);
        tasksExecuted.push("Fallback to pre-generated travel assets");
      }
    } else {
      tasksExecuted.push("No destination matched; processing generic query");
    }

    // 2. Assemble System Prompt
    const systemPrompt = `You are TravelSmart AI, an intelligent and friendly travel planning assistant.
Your primary purpose is to help users discover destinations, plan trips, create itineraries, estimate budgets, recommend activities, suggest transportation options, and answer travel-related questions.
You should communicate naturally like a helpful AI assistant.
You can help with:
- Destination recommendations
- Complete travel itineraries
- Day-by-day trip planning
- Budget planning
- Hotels and accommodation suggestions
- Tourist attractions
- Activities
- Restaurants and food recommendations
- Transportation suggestions
- Travel tips
- Packing suggestions
- Trip optimization
- Family, couple, solo, and group travel planning

When creating an itinerary, make it practical and easy to follow.
When enough information is available, create a useful answer without repeatedly asking unnecessary questions.
When important information is missing, ask concise follow-up questions.
Useful trip information includes: Destination, Travel dates, Trip duration, Number of travelers, Budget, Interests, Travel style, Accommodation preference, Transportation preference.

Always maintain the context of the current conversation.
If the user changes one part of their trip, modify the existing plan instead of starting from scratch.
Keep responses well structured and readable.
Use headings, bullet points, numbered lists, and tables when they improve readability.
Never claim that you performed an external booking, reservation, payment, or purchase unless the application actually provides that functionality.
You are the AI intelligence layer of TravelSmart.

${contextPlan ? `Below is the baseline pre-generated travel plan and real-time insights (weather, hotels, crowd metrics) for ${fetchedDest}. Use this as context to answer user requests, adjust details, change schedules, or customize the trip according to the user's instructions:\n\n${contextPlan}` : ""}`;

    // 3. Format messages history for OpenAI
    const formattedHistory = history.map((msg: any) => ({
      role: msg.role === 'ai' || msg.role === 'assistant' ? 'assistant' : 'user',
      content: msg.content
    }));

    const messages = [
      { role: "system", content: systemPrompt },
      ...formattedHistory,
      { role: "user", content: message }
    ];

    // 4. Call OmniRoute (with Fallback Chain)
    const omniRouteUrl = `${process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1"}/chat/completions`;
    const apiKey = process.env.OMNIROUTE_API_KEY || "";
    const defaultModel = process.env.OMNIROUTE_MODEL || "auto/best-free";

    // Deduplicate models to try (max 3 attempts)
    const FALLBACK_MODELS = [
      "auto/best-free",
      "kc/openrouter/free",
      "oc/hy3-free"
        ];
    const modelsToTry = [
      defaultModel,
      ...FALLBACK_MODELS.filter(m => m !== defaultModel)
    ].slice(0, 3);

    console.log(`[OmniRoute Chat API] Key prefix: ${apiKey ? apiKey.substring(0, 6) + "..." : "none"}. Fallback chain: ${modelsToTry.join(" -> ")}`);

    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    let response = null;
    let lastErrorText = "";
    let selectedModel = "";

    for (let attempt = 0; attempt < modelsToTry.length; attempt++) {
      selectedModel = modelsToTry[attempt];
      console.log(`[OmniRoute Chat API] Attempt ${attempt + 1}: Querying model "${selectedModel}"...`);

      try {
        response = await fetch(omniRouteUrl, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: selectedModel,
            messages,
            temperature: 0.7,
            stream: false
          })
        });

        if (response.ok) {
          console.log(`[OmniRoute Chat API] Attempt ${attempt + 1} succeeded with model "${selectedModel}"`);
          break;
        }

        const errText = await response.text();
        lastErrorText = `HTTP ${response.status}: ${errText}`;
        console.warn(`[OmniRoute Chat API] Attempt ${attempt + 1} ("${selectedModel}") failed with: ${lastErrorText}`);
      } catch (err: any) {
        lastErrorText = err.message || String(err);
        console.error(`[OmniRoute Chat API] Attempt ${attempt + 1} ("${selectedModel}") threw exception:`, err);
      }
    }

    if (!response || !response.ok) {
      console.error(`[OmniRoute Chat API] All fallback models failed. Last error: ${lastErrorText}`);
      return NextResponse.json(
        { error: "TravelSmart AI is temporarily busy. Please try again in a moment." },
        { status: 503 }
      );
    }

    const data = await response.json();
    const aiResponseText = data.choices?.[0]?.message?.content || "";
    
    if (!aiResponseText) {
      console.error(`[OmniRoute Chat API] Selected model "${selectedModel}" returned an empty response content`);
      return NextResponse.json(
        { error: "TravelSmart AI returned an empty response. Please try again." },
        { status: 500 }
      );
    }

    tasksExecuted.push(`Generated custom response using OmniRoute (${selectedModel})`);

    return NextResponse.json({
      content: aiResponseText,
      destination: fetchedDest,
      coordinates: fetchedCoords,
      tasks_executed: tasksExecuted
    });

  } catch (error: any) {
    console.error("Error in server-side AI API route:", error);
    return NextResponse.json(
      { error: "Internal server error. Please try again later." },
      { status: 500 }
    );
  }
}
