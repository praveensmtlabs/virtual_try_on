import { NextResponse } from "next/server";
import type { ClothingItem, ClothingCategory } from "@/types/clothing";

interface GenerateRequest {
  category: ClothingCategory;
  prompt: string;
  style?: string;
  color?: string;
  avatarId?: string;
  image?: string; // Base64 reference image
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
    tshirt: {
      modelPath: "/3dmodels/men/tshirts/basictee/basictee.glb",
      thumbnail: "/3dmodels/men/tshirts/basictee/basictee.png",
      skinned: true,
      hiddenBodyParts: ["chest", "back"],
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
    tshirt: {
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
    const { category, prompt, style = "Formal", color = "Black", avatarId = "adult-male", image } = body;

    if (!category || !prompt) {
      return NextResponse.json(
        { error: "Category and prompt are required" },
        { status: 400 }
      );
    }

    const targetAvatar = avatarId === "adult-female" ? "adult-female" : "adult-male";
    const timestamp = Date.now();

    // Direct color palette mapping
    let colorHex = "#121214";
    const colorMap: Record<string, string> = {
      pink: "#fbcfe8",
      white: "#f8f9fa",
      black: "#121214",
      navy: "#1e293b",
      charcoal: "#27272a",
      beige: "#d4b996",
      red: "#991b1b",
      blue: "#2563eb",
      green: "#166534",
    };

    const inputColorLower = color.toLowerCase();
    if (colorMap[inputColorLower]) {
      colorHex = colorMap[inputColorLower];
    } else {
      for (const [key, hex] of Object.entries(colorMap)) {
        if (inputColorLower.includes(key) || prompt.toLowerCase().includes(key)) {
          colorHex = hex;
          break;
        }
      }
    }

    // Compute fitScale based on style / fit parameter
    let fitScale = 1.0;
    const styleLower = style.toLowerCase();
    if (styleLower.includes("slim") || styleLower.includes("tight")) {
      fitScale = 0.95;
    } else if (styleLower.includes("oversized") || styleLower.includes("loose")) {
      fitScale = 1.08;
    } else if (styleLower.includes("casual")) {
      fitScale = 1.02;
    }

    // Call Gemini API (Vision / Multimodal synthesis if image present)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      try {
        const parts: any[] = [
          {
            text: `You are a 3D Fashion Synthesis AI. Synthesize 3D garment specs for prompt: "${prompt}", category: "${category}", color: "${color}", style: "${style}", bodyType: "${targetAvatar}". ${
              image ? "Analyze the attached reference clothing screenshot/image to extract its exact primary hex color, fabric pattern, and garment style." : ""
            } Return ONLY JSON format: {"colorHex": "#HEX", "garmentName": "Descriptive Name", "fitScale": 0.95}`
          }
        ];

        if (image) {
          const base64Data = image.includes(",") ? image.split(",")[1] : image;
          const mimeType = image.includes(";") ? image.split(";")[0].split(":")[1] : "image/png";
          parts.push({
            inlineData: {
              mimeType,
              data: base64Data
            }
          });
        }

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts }]
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
            if (typeof spec.fitScale === "number") fitScale = spec.fitScale;
          }
        }
      } catch (err) {
        console.warn("Gemini Vision API call warning, using synthesized fallback:", err);
      }
    }

    // Determine subcategory (e.g. T-Shirt vs Formal Shirt)
    let subCategory = category as string;
    if (category === "shirt" && (prompt.toLowerCase().includes("t-shirt") || prompt.toLowerCase().includes("tee") || styleLower.includes("casual"))) {
      subCategory = "tshirt";
    }

    // Retrieve real 3D model config for target avatar body shape
    const avatarCatalog = AVATAR_MODEL_CATALOG[targetAvatar] || AVATAR_MODEL_CATALOG["adult-male"];
    const config = avatarCatalog[subCategory] || avatarCatalog[category] || avatarCatalog["shirt"];

    const titleCat = subCategory === "tshirt" ? "T-Shirt" : category.charAt(0).toUpperCase() + category.slice(1);
    const item: ClothingItem = {
      id: `${category}-gemini-${timestamp}`,
      name: `Gemini AI ${image ? "Custom Vision" : color} ${style} ${titleCat}`,
      category: category as ClothingCategory,
      modelPath: config.modelPath,
      thumbnail: image || config.thumbnail,
      compatibleAvatars: [targetAvatar],
      hiddenBodyParts: config.hiddenBodyParts,
      skeletonProfile: targetAvatar,
      color: colorHex,
      useGlb: true,
      skinned: config.skinned,
      fitScale: fitScale,
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
