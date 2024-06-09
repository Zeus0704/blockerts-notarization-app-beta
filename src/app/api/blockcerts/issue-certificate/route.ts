import { NextResponse } from "next/server";
import axios from 'axios'

export async function POST(req: Request) {

    try {
        const { certificate, newIssuingAddress, privateKey } = await req.json();
        // const validatedData = await certificatesSchema.parseAsync(data);

        const response = await axios.post('http://localhost:3002/issue', {
            certificates: [certificate],
            newIssuingAddress,
            privateKey
        });

        return NextResponse.json(response.data);
    } catch (error) {
        if (error) {
            // Handle validation errors
            return NextResponse.json(
                { error: error },
                { status: 400 }
            );
        } else {
            console.error(error);
            return NextResponse.json(
                { error: 'Failed!' },
                { status: 500 }
            );
        }
    }
}