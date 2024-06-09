import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

import { env } from "@/env.mjs"
import { getUserByEmail } from "@/actions/user"
import { getInstitutionByUserEmail } from "@/actions/institutions"
import urlSafeBase64 from 'urlsafe-base64'

import { JWK } from "jose"
import { ethers } from "ethers"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | number) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date))
}

export function absoluteUrl(path: string) {
  return `${env.NEXT_PUBLIC_APP_URL}${path}`
}

export function truncate(str: string, length: number) {
  return str.length > length ? `${str.substring(0, length)}...` : str
}

export async function getGitHubStars(): Promise<number | null> {
  try {
    const response = await fetch(
      "https://api.github.com/repos/pjborowiecki/SAASY-LAND-Next-14-Starters-With-Authentication-And-Database-Implemented",
      {
        headers: {
          Accept: "application/vnd.github+json",
        },
        next: {
          revalidate: 60,
        },
      }
    )

    if (!response.ok) return null

    const data = (await response.json()) as { stargazers_count: number }

    return data.stargazers_count
  } catch (err) {
    console.error(err)
    return null
  }
}

export async function handleDownloadJsonFile(data: any, filename: string): Promise<Boolean> {
  try {
    const jsonData = JSON.stringify(data.certificate, null, 2)
    const blob = new Blob([jsonData], { type: 'application/json' })
    const url = URL.createObjectURL(blob)

    const link = document.createElement('a')
    link.download = `${filename}.json`
    link.href = url
    link.click()

    URL.revokeObjectURL(url)

    return true
  } catch (error) {
    console.error(error)
    return false
  }
}


export async function getBase64(file: File) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = (error) => reject(error)
  })
}

export function formatBytes(
  bytes: number,
  opts: {
    decimals?: number
    sizeType?: "accurate" | "normal"
  } = {}
) {
  const { decimals = 0, sizeType = "normal" } = opts

  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const accurateSizes = ["Bytes", "KiB", "MiB", "GiB", "TiB"]
  if (bytes === 0) return "0 Byte"
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(decimals)} ${sizeType === "accurate" ? accurateSizes[i] ?? "Bytest" : sizes[i] ?? "Bytes"
    }`
}


export async function isConnectedToWallet(email: string | null): Promise<Boolean> {
  if (!email) return false

  try {
    const user = await getUserByEmail({ email })

    // To get institution wallet...
    if (user?.role !== "STUDENT") {
      const institution = await getInstitutionByUserEmail(email)

      if (institution && institution.wallet) {
        return true
      }

      return false
    }

    return false
  } catch (error) {
    console.error(error)
    return false
  }
}



export const getPublicKeyFromPrivateKey = async (privateKey: string): Promise<JWK> => {
  const wallet = new ethers.Wallet(privateKey);

  const publicKey = wallet.publicKey.slice(2);
  const publicKeyBuffer = Buffer.from(publicKey, 'hex');

  const x = urlSafeBase64.encode(publicKeyBuffer.subarray(1, 33));
  const y = urlSafeBase64.encode(publicKeyBuffer.subarray(33, 65));

  const publicJWK: JWK = {
    kty: 'EC',
    crv: 'secp256k1',
    x: x,
    y: y,
  };

  return publicJWK;
};


export function getBlockcertsPublicKeyId(privateKey: string): string | null {
  try {
    const provider = new ethers.providers.JsonRpcProvider()

    const wallet = new ethers.Wallet(privateKey, provider)

    const publicKey = wallet.publicKey

    if (!publicKey) {
      return null
    }

    const publicKeyBytes = new Uint8Array(
      ethers.utils.hexlify(ethers.utils.arrayify(publicKey)).slice(2).match(/.{2}/g)!.map(byte => parseInt(byte, 16))
    )

    const publicKeyId = `ecdsa-koblitz-pubkey:${publicKey.slice(2).toLowerCase()}`

    return publicKeyId
  } catch (error) {
    console.error('Error getting Blockcerts public key ID:', error)
    return null
  }
}