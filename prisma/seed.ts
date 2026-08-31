import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "./generated/client";

const adapter = new PrismaPg({
    connectionString: process.env["DATABASE_URL"],
});
const prisma = new PrismaClient({ adapter });

const CATEGORIES = [
    {
        name: "Birthday",
        slug: "birthday",
        description: "Bright, celebratory arrangements for birthdays.",
    },
    {
        name: "Wedding",
        slug: "wedding",
        description: "Romantic bouquets and ceremony flowers.",
    },
    {
        name: "Anniversary",
        slug: "anniversary",
        description: "Timeless roses and keepsake blooms.",
    },
    {
        name: "Sympathy",
        slug: "sympathy",
        description: "Graceful, respectful tributes.",
    },
    {
        name: "Graduation",
        slug: "graduation",
        description: "Cheerful bouquets to mark the milestone.",
    },
    {
        name: "Just Because",
        slug: "just-because",
        description: "A little something to brighten the day.",
    },
];

const STEMS = [
    { name: "Red Rose", color: "red" },
    { name: "Pink Rose", color: "pink" },
    { name: "White Lily", color: "white" },
    { name: "Yellow Tulip", color: "yellow" },
    { name: "Purple Orchid", color: "purple" },
    { name: "Sunflower", color: "yellow" },
    { name: "Baby's Breath", color: "white" },
    { name: "Peony", color: "pink" },
    { name: "Lavender", color: "purple" },
    { name: "Carnation", color: "red" },
];

const ADJECTIVES = [
    "Garden",
    "Morning",
    "Velvet",
    "Sunlit",
    "Blush",
    "Meadow",
    "Amber",
    "Coral",
    "Ivory",
    "Dawn",
    "Silk",
    "Wild",
];
const NOUNS = [
    "Bouquet",
    "Bloom Box",
    "Posy",
    "Arrangement",
    "Basket",
    "Bundle",
];

// Deterministic price ladder with deliberate ties (for cursor-tiebreaker tests).
const PRICES = [
    150000, 180000, 180000, 220000, 250000, 250000, 280000, 320000, 360000,
    420000, 480000, 550000, 620000, 720000, 900000,
];

const PRODUCT_COUNT = 56;

function slugify(s: string): string {
    return s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
}

async function main() {
    // Idempotent: wipe catalog tables (dev only) in FK-safe order, then recreate.
    await prisma.productStem.deleteMany();
    await prisma.product.deleteMany();
    await prisma.stem.deleteMany();
    await prisma.category.deleteMany();

    const categories = await Promise.all(
        CATEGORIES.map((c) => prisma.category.create({ data: c })),
    );

    const stems = await Promise.all(
        STEMS.map((s, i) =>
            prisma.stem.create({
                data: {
                    ...s,
                    stock: i % 4 === 0 ? 0 : 40 + ((i * 37) % 160),
                    criticalMin: 10,
                },
            }),
        ),
    );

    let made = 0;
    let productStemRows = 0;
    for (let i = 0; i < PRODUCT_COUNT; i++) {
        const category = categories[i % categories.length]!;
        const noun = NOUNS[i % NOUNS.length]!;
        const name = `${ADJECTIVES[i % ADJECTIVES.length]} ${noun} ${i + 1}`;
        const price = PRICES[i % PRICES.length]!;
        // Several products deliberately out of stock.
        const stock = i % 9 === 0 ? 0 : 5 + ((i * 7) % 40);
        // ~6 featured products: i in {3, 13, 23, 33, 43, 53}.
        const isFeatured = i % 10 === 3;
        // 2..4 stems per product, chosen deterministically (unique per product).
        const stemCount = 2 + (i % 3);
        const chosen = Array.from(
            { length: stemCount },
            (_, j) => stems[(i + j) % stems.length]!,
        );

        await prisma.product.create({
            data: {
                name,
                slug: slugify(name),
                description: `A hand-tied ${noun.toLowerCase()} of seasonal stems, perfect for ${category.name.toLowerCase()}.`,
                price,
                images: [],
                stock,
                isFeatured,
                categoryId: category.id,
                stems: {
                    create: chosen.map((stem, j) => ({
                        stemId: stem.id,
                        quantity: 3 + j * 2,
                    })),
                },
            },
        });
        made++;
        productStemRows += stemCount;
    }

    console.log(
        `Seeded ${categories.length} categories, ${stems.length} stems, ${made} products (${productStemRows} product-stem rows).`,
    );
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
