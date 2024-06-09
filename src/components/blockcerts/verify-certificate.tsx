import { Certificate } from "@blockcerts/cert-verifier-js"
import React, { useState } from "react"

const VerifyCertificate: React.FC = () => {
    const [file, setFile] = useState<File | undefined>(undefined)
    const [verificationResult, setVerificationResult] = useState<any>(null)
    const [error, setError] = useState<string | null>(null)

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if(e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0])
        }
    }

    const handleVerify = async () => {
        if(!file) {
            setError("No File Selected")
            return
        }

        try {
            setError(null)
            setVerificationResult(null)

            const fileReader = new FileReader()
            fileReader.onload = async (event) => {
                if(event.target && event.target.result) {
                    try {
                        const certificateJson = JSON.parse(event.target.result as string)

                        let certificate = new Certificate(certificateJson)
                        await certificate.init()

                        console.log("certificate: ", certificate)

                        const result = await certificate.verify()
                        setVerificationResult(result)
                    } catch (err) {
                        console.error(err)
                        setError(`Error parsing or verifying certificate: ${err.message}`)
                    }
                }
            }
            fileReader.readAsText(file)
        } catch (err) {
            console.error(err)
            setError(`Error reading file: ${err.message}`)
        }
    }


    return (
        <div>
            <h1>Verify Blockcerts Certificate</h1>
            <input 
                type="file"
                accept=".json"
                onChange={handleFileChange}
            />
            <button onClick={handleVerify}>Verify</button>

            {verificationResult && (
                <div>
                    <h2>Verification Result</h2>
                    <pre>{JSON.stringify(verificationResult, null, 2)}</pre>
                </div>
            )}
            {error && (
                <div>
                    <h2>Error</h2>
                    <p>{error}</p>
                </div>
            )}
        </div>
    )
}

export default VerifyCertificate