import connectMongoDB from "../../../lib/mongodb"

export async function GET() {
    try {
        await connectMongoDB();
        return Response.json({ message: 'Database successfully connected!!' });
    } catch {
        return Response.json({ error: 'Database connection failed' }, { status: 500 });
    }
}
