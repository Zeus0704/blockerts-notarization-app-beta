"use client"
import { type ReactNode, useState, useEffect } from "react"

import { RainbowKitProvider } from "@rainbow-me/rainbowkit"
import { WagmiProvider } from "wagmi"
import { wagmiConfig } from "@/config/wagmi"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"


export function WalletProvider({ children }: Readonly<{ children: ReactNode }>) {
    const [mounted, setMounted] = useState(false);

    useEffect(() => setMounted(true), []);

    const queryClient = new QueryClient()

    const appInfo = {
        appName: "Blockcerts-Notarization-App-Beta",
    };

    return (
        <WagmiProvider config={wagmiConfig}>
            <QueryClientProvider client={queryClient}>
                <RainbowKitProvider coolMode appInfo={appInfo}>
                    {mounted && children}
                </RainbowKitProvider>
            </QueryClientProvider>
        </WagmiProvider>
    );
}
