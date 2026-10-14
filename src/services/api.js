const API_BASE_URL = "http://127.0.0.1:8000";

/**
 * Generic API request helper.
 */
async function request(endpoint, options = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  return response.json();
}


/* ==================================================
   ACCESS
================================================== */

export async function loginToUltron(password) {
  try {
    return await request("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
  } catch (error) {
    if (error.message === "Server returned 401") {
      throw new Error("INVALID_PASSWORD");
    }
    throw error;
  }
}

/* ==================================================
   CHAT
================================================== */

export async function sendChatMessage(message, mode = "normal") {
  return request("/chat", {
    method: "POST",
    body: JSON.stringify({
      message,
      mode,
    }),
  });
}

export async function analyzeVision(image, prompt) {
  return request("/vision/analyze", {
    method: "POST",
    body: JSON.stringify({
      image,
      prompt,
    }),
  });
}

/* ==================================================
   MISSIONS
================================================== */

export async function getMissions() {
  return request("/missions");
}

export async function getDueMissions() {
  return request("/missions/due");
}

export async function updateMission(missionId, updates) {
  return request(`/missions/${missionId}`, {
    method: "PATCH",
    body: JSON.stringify(updates),
  });
}

export async function deleteMission(missionId) {
  const response = await fetch(
    `${API_BASE_URL}/missions/${missionId}`,
    {
      method: "DELETE",
    }
  );

  if (!response.ok) {
    throw new Error(`Server returned ${response.status}`);
  }

  return response.json();
}

/* ==================================================
   VOICE
================================================== */

export async function generateVoice(text, language = null) {
  return request("/voice", {
    method: "POST",
    body: JSON.stringify({
      text,
      language,
    }),
  });
}

/* ==================================================
   SYSTEM
================================================== */

export async function getSystemStatus() {
  return request("/");
}

export async function getSystemScan() {
  return request("/system/scan");
}

export { API_BASE_URL };