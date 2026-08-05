import { NextResponse } from "next/server";
import type { ClothingItem, ClothingCategory } from "@/types/clothing";

interface GenerateRequest {
  category: ClothingCategory;
  prompt: string;
  style?: string;
  color?: string;
  avatarId?: string;
}

const AVATAR_MODEL_CATALOG: Record<
  string,
  Record<
    string,
    {
      modelPath: string;
      thumbnail: string;
      skinned: boolean;
      hiddenBodyParts: ("chest" | "back" | "upperArms" | "hips" | "upperLegs" | "lowerLegs")[];
    }
  >
> = {
  "adult-male": {
    coat: {
      modelPath: "/3dmodels/men/upper/nycardigantop/nycardigantop.glb",
      thumbnail: "/images/clothes/navy-coat.png",
      skinned: true,
      hiddenBodyParts: ["chest", "back", "upperArms"],
    },
    shirt: {
      modelPath: "/3dmodels/men/upper/smartshirttop/smartshirttop.glb",
      thumbnail: "/images/clothes/white-shirt.png",
      skinned: true,
      hiddenBodyParts: ["chest", "back", "upperArms"],
    },
    pants: {
      modelPath: "/3dmodels/men/pants/pants_black/tight_pant.glb",
      thumbnail: "/images/clothes/charcoal-pants.png",
      skinned: false,
      hiddenBodyParts: ["hips", "upperLegs", "lowerLegs"],
    },
  },
  "adult-female": {
    coat: {
      modelPath: "/3dmodels/women/outfits/azure/azure.glb",
      thumbnail: "/images/clothes/apricot-hoodie.png",
      skinned: true,
      hiddenBodyParts: ["chest", "back", "hips"],
    },
    shirt: {
      modelPath: "/3dmodels/women/tops/skylinecroptee/skylinecroptee.glb",
      thumbnail: "/images/clothes/white-shirt.png",
      skinned: true,
      hiddenBodyParts: ["chest", "back"],
    },
    pants: {
      modelPath: "/3dmodels/women/pants/women_fashionable_woven_pant.glb",
      thumbnail: "/images/clothes/charcoal-pants.png",
      skinned: false,
      hiddenBodyParts: ["hips", "upperLegs", "lowerLegs"],
    },
  },
};

export async function POST(req: Request) {
  try {
    const body: GenerateRequest = await req.json();
    const { category, prompt, style = "Formal", color = "Black", avatarId = "adult-male" } = body;

    if (!category || !prompt) {
      return NextResponse.json(
        { error: "Category and prompt are required" },
        { status: 400 }
      );
    }

    const targetAvatar = avatarId === "adult-female" ? "adult-female" : "adult-male";
    const timestamp = Date.now();

    // Default color mapping
    let colorHex = "#121214";
    const colorMap: Record<string, string> = {
      pink: "#fbcfe8",
      black: "#121214",
      white: "#f8f9fa",
      navy: "#1e293b",
      charcoal: "#27272a",
      beige: "#d4b996",
      red: "#991b1b",
      blue: "#2563eb",
      green: "#166534",
    };

    const inputColorLower = color.toLowerCase();
    for (const [key, hex] of Object.entries(colorMap)) {
      if (inputColorLower.includes(key) || prompt.toLowerCase().includes(key)) {
        colorHex = hex;
        break;
      }
    }

    // Call Gemini API if GEMINI_API_KEY environment variable is present
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      text: `You are a 3D Fashion Synthesis AI. Synthesize 3D garment specs for prompt: "${prompt}", category: "${category}", color: "${color}", style: "${style}", bodyType: "${targetAvatar}". Return ONLY JSON: {"colorHex": "#HEX", "garmentName": "Descriptive Name"}`
                    }
                  ]
                }
              ]
            })
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const textResponse = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";
          const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const spec = JSON.parse(jsonMatch[0]);
            if (spec.colorHex) colorHex = spec.colorHex;
          }
        }
      } catch (err) {
        console.warn("Gemini API call warning, using synthesized fallback:", err);
      }
    }

    // Retrieve real 3D model config for target avatar body shape
    const avatarCatalog = AVATAR_MODEL_CATALOG[targetAvatar] || AVATAR_MODEL_CATALOG["adult-male"];
    const config = avatarCatalog[category] || avatarCatalog["shirt"];

    const titleCat = category.charAt(0).toUpperCase() + category.slice(1);
    const item: ClothingItem = {
      id: `${category}-gemini-${timestamp}`,
      name: `Gemini AI ${color} ${style} ${titleCat}`,
      category: category as ClothingCategory,
      modelPath: config.modelPath,
      thumbnail: config.thumbnail,
      compatibleAvatars: [targetAvatar],
      hiddenBodyParts: config.hiddenBodyParts,
      skeletonProfile: targetAvatar,
      color: colorHex,
      useGlb: true,
      skinned: config.skinned,
      fitScale: 1,
    };

    return NextResponse.json({ success: true, item });
  } catch (error: unknown) {
    const errMessage = error instanceof Error ? error.message : "Failed to generate 3D clothing asset";
    console.error("3D Clothing Generation Error:", error);
    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}
