import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import connectToDatabase from "@/lib/mongodb";
import Restaurant from "@/models/Restaurant";
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get("auth_token")?.value;
        if (!token) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        let decodedToken;
        try {
            decodedToken = jwt.verify(token, JWT_SECRET) as {
                restaurantId?: string;
                userId?: string;
                role: string;
            };

            if (decodedToken.role !== "restaurant") {
                return NextResponse.json({ message: "Unauthorized - Not a restaurant" }, { status: 403 });
            }
        } catch (error) {
            return NextResponse.json({ message: "Invalid token" }, { status: 401 });
        }

        await connectToDatabase();

        const url = new URL(request.url);
        const id = url.searchParams.get("id");
        console.log("Restaurant ID:", decodedToken.userId, decodedToken.restaurantId);
        const restaurants = await Restaurant.find(
            {
              $or: [
                { associatedId: decodedToken.userId },     
                { userId: decodedToken.userId },        
              ],
            },
            { _id: 1, name: 1 } // Only select the ID and name fields
          );

        if (!restaurants || restaurants.length === 0) {
            return NextResponse.json([], { status: 200 });
        }

        return NextResponse.json({ success: true, restaurants });

    } catch (error: any) {
        console.error("Error fetching restaurant data:", error);
        return NextResponse.json(
            { message: "Failed to fetch restaurant data", error: error.message },
            { status: 500 }
        );
    }
}