"use client"

import { pdfToImg } from "@/lib/pdf-to-img"
import { useEffect, useState } from "react"
import { extractKeyInfo } from "@/lib/process-with-gpt"
import { getBlockcertsPublicKeyId, getPublicKeyFromPrivateKey, handleDownloadJsonFile, isConnectedToWallet } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { getInstitutionById } from "@/actions/institutions"
import { Institution } from "@prisma/client"
import { useSession } from "next-auth/react"
import { useAccount } from "wagmi"
import { Input } from "@/components/ui/input"
import { generateIssuerProfile } from "@/lib/certificate-template"

enum Status {
    IDLE,
    UPLOADING,
    ANALYZING,
    SUCCESS,
    ERROR,
    PROCESSING
}

/**
 * This page is used to process orders from students...
 * The main point is to get recipient university information at first...
 * Also it is important to set issuer data to write on created certificate JSON file...
 * Transcript data is caught by OCR from uploaded transcript pdf file...
 * 
 * @returns JSX 
 */
export default function Page({ params }: { params: { id: string } }): JSX.Element {
    /**
     * States...
     */
    const [pdfContent, setPdfContent] = useState<string[]>([])
    const [status, setStatus] = useState(Status.IDLE)
    const [pagesFinished, setPagesFinished] = useState(0)
    const [totalPages, setTotalPages] = useState(0)

    const session = useSession()
    const [email, setEmail] = useState<string | null>(null)

    const [recipientData, setRecipientData] = useState<Institution | null>(null)
    const [issuerData, setIssuerData] = useState<string>("https://raw.githubusercontent.com/admiral9200/certificates-test/main/certificates/profile.json")
    const [transcriptData, setTranscriptData] = useState<any>(null)
    const [certificate, setCertificate] = useState(null)
    const [privateKey, setPrivateKey] = useState<string | null>(null)
    const [publicKey, setPublicKey] = useState<string | null>(null)
    const [showPrivateKeyDlg, setShowPrivateKeyDlg] = useState<Boolean>(false)

    const { isConnected, address } = useAccount()


    /**
     * Life cycle
     */
    useEffect(() => {
        async function fetchRecipientData() {
            try {
                const result = await getInstitutionById(params.id)

                if (typeof result !== 'string') {
                    setRecipientData(result)
                }
            } catch (error) {
                console.error(error)
            }
        }

        fetchRecipientData()
    }, [])


    useEffect(() => {
        if (session.data?.user.email) {
            setEmail(session.data.user.email)
        }
    }, [session.data?.user.email])

    /**
     * Handling functionality to extract PDF file...
     * OCR will be used in this function to catch key information...
     * @param file 
     * @returns 
     */
    const handleExtractPDF = async (file: File) => {
        if (!file) return

        try {
            const images = await pdfToImg(file)
            setTotalPages(images.length)
            setStatus(Status.ANALYZING)

            const pages = []

            for (let i = 0; i < images.length; i++) {
                const image = images[i]
                const text = await runOCR(String(image))
                const textArray = text?.map((item: { Text: string }) => item.Text)
                pages.push(textArray?.join(" "))
                setPagesFinished(i + 1)
            }

            return pages
        } catch (error) {
            console.error("Error extracting PDF: ", error)
            setStatus(Status.ERROR)
        }
    }

    /**
     * How to use OCR in Next.JS typescript...
     * @param imageUrl 
     * @returns 
     */
    const runOCR = async (imageUrl: string) => {
        try {
            const response = await fetch("/api/textract", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ dataUrl: imageUrl })
            })

            const data = await response.json()
            return data?.Blocks.filter(
                (item: { BlockType: string }) => item.BlockType === "LINE"
            )
        } catch (error) {
            console.log("error", error)
        }
    }

    /**
     * Handling file uploads...
     * @param event 
     * @returns 
     */
    const handleFileChange = async (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        const files = event.target.files
        if (!files) return

        const file = files[0]
        if (file) {
            if (!isConnected) {
                alert("You need to connect to wallet")
                return
            }

            if (!showPrivateKeyDlg) setShowPrivateKeyDlg(true)

            if (privateKey) {
                if(address) {
                    const publicKeyInJWK =  await getPublicKeyFromPrivateKey(privateKey)
                    const publicKeyId = getBlockcertsPublicKeyId(privateKey)

                    // console.log("public key: ", publicKeyId)

                    setPublicKey(publicKeyId)
                    
                    let createdIssuer = generateIssuerProfile(address, publicKeyId,  publicKeyInJWK, new Date().toISOString())

                    console.log("public keys: ", publicKeyInJWK, publicKeyId)

                    // console.log("created issuer: ", createdIssuer)

                    // setIssuerData(createdIssuer)

                    // const jsonData = JSON.stringify(createdIssuer, null, 2);

                    // Create a download link
                    // const downloadLink = document.createElement("a");
                    // downloadLink.setAttribute("href", "data:application/json;charset=utf-8," + encodeURIComponent(jsonData));
                    // downloadLink.setAttribute("download", "issuer_profile.json");

                    // // Append the download link to the document
                    // document.body.appendChild(downloadLink);

                    // // Click the download link to initiate the file download
                    // downloadLink.click();

                    // // Remove the download link from the document
                    // document.body.removeChild(downloadLink);
                }


                setStatus(Status.UPLOADING)
                const pdfContent = await handleExtractPDF(file)
                const formattedPdfContent = pdfContent?.map(
                    (item: string, index: number) => `Page ${index + 1}:\n${item}\n\n`
                )

                const data = await extractKeyInfo(formattedPdfContent)
                const extractedData = data.choices[0].message.content

                const startIndex = extractedData.indexOf("```json")
                const endIndex = startIndex + "```json".length
                const jsonPart = extractedData.slice(endIndex)

                const lastIndex = jsonPart.lastIndexOf("```")
                const result = jsonPart.slice(0, lastIndex)

                if (result) {
                    setTranscriptData(JSON.parse(result))
                }

                setTimeout(() => {
                    setStatus(Status.SUCCESS)
                    setPdfContent(formattedPdfContent!)
                }, 1000)
            } else {
                alert("You need to enter the private key of your connected wallet! After submitting, the private key will be removed for your security!")
                return
            }
        }
    }

    /**
     * This function is used to handle generation of a certificate...
     */
    const handleGenerateCertificate = async () => {
        try {
            const response = await fetch('/api/blockcerts/create-certificate', {
                method: "POST",
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ recipientData, transcriptData, issuerData, publicKey })
            })

            const data = await response.json()

            if (response.ok) {
                setCertificate(data.certificate)
                setStatus(Status.PROCESSING)

                await handleDownloadJsonFile(data, "example-test-name")
                const res = await fetch('/api/blockcerts/issue-certificate', {
                    method: "POST",
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        certificate: data.certificate,
                        newIssuingAddress: address,
                        privateKey
                    })
                })

                const data_01 = await res.json()

                console.log("data1: ", data_01, data)
            } else {
                console.log("error")
            }
        } catch (error) {
            console.error(error)
        }
    }

    return (
        <div className="flex min-h-screen flex-col w-full items-center justify-center">
            <h4 className="text-2xl font-semibold">
                Please upload Transcripts (PDF)
            </h4>
            {
                {
                    [Status.IDLE]: (
                        <div>
                            <Input type="text" placeholder="private key" onChange={e => setPrivateKey(e.target.value)} />
                            <br />
                            <input
                                type="file"
                                accept=".pdf"
                                onChange={handleFileChange}
                                className="ml-28"
                            />
                        </div>
                    ),
                    [Status.UPLOADING]: <p>Uploading PDF...</p>,
                    [Status.ANALYZING]: (
                        <p className="text-center">
                            Analyzing PDF... <br />
                            {pagesFinished} of {totalPages} pages analyzed.
                        </p>
                    ),
                    [Status.SUCCESS]: (
                        <div>
                            <p>PDF successfully analyzed</p>
                            <Button onClick={handleGenerateCertificate}>Create Certificate</Button>
                        </div>
                    ),
                    [Status.ERROR]: <p>Error analyzing PDF.</p>,
                    [Status.PROCESSING]: (
                        <div>
                            <p>Successfully Created!</p>

                        </div>
                    )
                }[status]
            }

            {pdfContent &&
                pdfContent.map((page, index) => (
                    <div
                        key={index}
                        className="sm:w-[800px] w-full mt-6 bg-background border border-input rounded-md p-6"
                    >
                        <p className="text-lg font-medium mt-4">Page {index + 1}</p>
                        <p className="mt-4">{page}</p>
                    </div>
                ))}
        </div>
    )
}