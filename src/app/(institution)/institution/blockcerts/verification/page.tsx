"use client"

import VerifyCertificate from "@/components/blockcerts/verify-certificate";

export default function Page(): JSX.Element {
    return (
        <div>
            <h1>Blockcerts Certificate Verification</h1>
            <VerifyCertificate />
        </div>
    )
}