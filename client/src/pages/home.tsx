import React from 'react';

export default function Home() {
  return (
    <div className="flex h-screen items-center justify-center bg-red-500 text-white text-4xl font-bold">
      YOU SHOULD NOT SEE THIS PAGE (HOME COMPONENT)
      <br />
      If you see this, the routing is still pointing to Home!
    </div>
  );
}

