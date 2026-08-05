import type { Outfit } from "@/types/outfit";

export const OUTFITS: Outfit[] = [
  {
    id: "outfit-formal-male",
    name: "Black Formal",
    avatarId: "adult-male",
    clothing: {
      coatId: "coat-navy-001",
      shirtId: "shirt-white-001",
      pantsId: "pants-charcoal-001",
    },
  },
  {
    id: "outfit-casual-female",
    name: "Casual Chic",
    avatarId: "adult-female",
    clothing: {
      coatId: "coat-beige-001",
      shirtId: "shirt-blush-001",
      pantsId: "pants-slate-001",
    },
  },
  {
    id: "outfit-kids-play",
    name: "Play Day",
    avatarId: "boy",
    clothing: {
      coatId: "coat-hoodie-001",
      shirtId: "shirt-black-001",
      pantsId: "pants-khaki-001",
    },
  },
];
