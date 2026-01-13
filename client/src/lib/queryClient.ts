import { QueryClient, QueryFunction } from "@tanstack/react-query";
import { auth } from "./firebase";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        const json = await res.json();
        errorMessage = json.error || json.message || errorMessage;
      } else {
        errorMessage = await res.text() || errorMessage;
      }
    } catch (e) {
      // If parsing fails, use status text
    }
    throw new Error(errorMessage);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  // Get Firebase ID token if user is authenticated
  let authToken: string | null = null;
  try {
    const currentUser = auth.currentUser;
    if (currentUser) {
      authToken = await currentUser.getIdToken();
    }
  } catch (error) {
    // If token fetch fails, continue without token (will get 401 if auth required)
    console.warn("Failed to get Firebase token:", error);
  }

  const headers: HeadersInit = {};
  if (data) {
    headers["Content-Type"] = "application/json";
  }
  if (authToken) {
    headers["Authorization"] = `Bearer ${authToken}`;
  }

  const res = await fetch(url, {
    method,
    headers,
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  // Store the response before checking, so error handlers can access it
  if (!res.ok) {
    // Try to extract error details from response before throwing
    let errorMessage = res.statusText;
    let errorData: any = { error: errorMessage };
    
    try {
      const contentType = res.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        errorData = await res.json();
        errorMessage = errorData.error || errorData.message || errorMessage;
      } else {
        errorMessage = await res.text() || errorMessage;
      }
    } catch (e) {
      // If parsing fails, use status text
    }
    
    const error: any = new Error(errorMessage);
    error.response = res; // Attach response for error handling
    error.status = res.status;
    error.errorData = errorData; // Attach parsed error data
    throw error;
  }
  
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const url = queryKey.join("/") as string;
    const isCurrentUserQuery = url === '/api/auth/current-user';
    
    // Get Firebase ID token if user is authenticated
    let authToken: string | null = null;
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        authToken = await currentUser.getIdToken();
      }
    } catch (error) {
      // If token fetch fails, continue without token (will get 401 if auth required)
      console.warn("Failed to get Firebase token:", error);
    }
    
    if (isCurrentUserQuery) {
      logDebug('queryClient.ts:getQueryFn', 'Fetching current-user', { 
        url,
        hasToken: !!authToken,
        timestamp: Date.now()
      }, 'H2');
    }
    
    const headers: HeadersInit = {};
    if (authToken) {
      headers["Authorization"] = `Bearer ${authToken}`;
    }
    
    const res = await fetch(url, {
      headers,
      credentials: "include",
    });

    if (isCurrentUserQuery) {
      logDebug('queryClient.ts:getQueryFn', 'Current-user response', { 
        status: res.status,
        statusText: res.statusText,
        hasSetCookie: res.headers.get('set-cookie') !== null,
        timestamp: Date.now()
      }, 'H2');
    }

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      if (isCurrentUserQuery) {
        logDebug('queryClient.ts:getQueryFn', 'Current-user returned 401 (unauthorized)', {}, 'H2');
      }
      return null;
    }

    await throwIfResNotOk(res);
    const jsonData = await res.json();
    
    if (isCurrentUserQuery) {
      logDebug('queryClient.ts:getQueryFn', 'Current-user response data', { 
        hasUser: !!jsonData?.user,
        userId: jsonData?.user?.id,
        timestamp: Date.now()
      }, 'H2');
    }
    
    return jsonData;
  };

// #region agent log
const logDebug = (location: string, message: string, data: any, hypothesisId: string) => {
  const logData = {location,message,data,timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId};
  console.log(`[DEBUG ${hypothesisId}]`, location, message, data);
  fetch('http://127.0.0.1:7243/ingest/9504a544-9592-4c7b-afe6-b49cb5e62f9f',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(logData)}).catch((e)=>console.error('Log fetch failed:',e));
};
// #endregion

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});

// #region agent log
// Monitor query cache changes
queryClient.getQueryCache().subscribe((event) => {
  if (event?.type === 'updated' || event?.type === 'added' || event?.type === 'removed') {
    const queryKey = event.query?.queryKey;
    const isCurrentUserQuery = Array.isArray(queryKey) && queryKey[0] === '/api/auth/current-user';
    
    if (isCurrentUserQuery) {
      const state = event.query?.state;
      const data = state?.data as any;
      logDebug('queryClient.ts', 'Current-user query cache event', { 
        type: event.type, 
        queryKey,
        status: state?.status,
        hasUser: !!data?.user,
        userId: data?.user?.id,
        dataUpdatedAt: state?.dataUpdatedAt,
        dataFetchStatus: state?.fetchStatus,
        timestamp: Date.now()
      }, 'H2');
    } else {
      logDebug('queryClient.ts', 'Query cache event', { 
        type: event.type, 
        queryKey: event.query?.queryKey,
        state: event.query?.state?.status 
      }, 'H2');
    }
  }
});
// #endregion
