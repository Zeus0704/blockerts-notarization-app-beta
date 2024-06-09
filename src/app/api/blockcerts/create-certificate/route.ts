import { generateCertificateTemplate } from "@/lib/certificate-template"
import { NextResponse } from "next/server"
// import didJWT from 'did-jwt'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: Request) {
  const didJWT = require('did-jwt')
  const signer = didJWT.ES256KSigner(didJWT.hexToBytes('824b4866661189d453a1adc3af4dc22ab97009544ce702f90da13b31ba344de6'))
  let jwt = await didJWT.createJWT(
    { aud: 'did:ethr:0x3c102A4b4887BDe82D63f26b79dde0756DEE16B9', iat: undefined, name: 'uPort Developer' },
    { issuer: 'did:ethr:0x3c102A4b4887BDe82D63f26b79dde0756DEE16B9', signer },
    { alg: 'ES256K' }
  )

  const generateCertificate = async (recipientData: any, transcriptData: any, issuerData: any, publicKey: string) => {
    const certificate = generateCertificateTemplate(
      uuidv4(),
      issuerData,
      jwt,
      recipientData,
      transcriptData.transcript,
      publicKey
    )

    return certificate
  }

  try {
    const { recipientData, transcriptData, issuerData, publicKey } = await req.json()
    const certificate = await generateCertificate(recipientData, transcriptData, issuerData, publicKey)

    return NextResponse.json(
      { certificate },
      { status: 200 }
    )
  } catch (error) {
    console.error(error)
    return NextResponse.json(
      { error: "Failed!" },
      { status: 500 }
    )
  }
}