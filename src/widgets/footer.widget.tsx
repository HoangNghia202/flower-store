import { Flower } from "lucide-react";

const cols = [
    { title: "Shop", links: ["All Flowers", "Seasonal Picks", "Custom Bouquets", "Gift Cards"] },
    { title: "Help", links: ["Delivery Info", "FAQ", "Flower Care Guide", "Contact Us"] },
    { title: "Company", links: ["About Us", "Blog", "Careers", "Privacy Policy"] },
];

export function FooterWidget() {
    return (
        <footer className="bg-gray-900 text-gray-400">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-10 mb-12">
                    {/* Brand column */}
                    <div className="col-span-2 lg:col-span-1">
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-gradient-to-br from-pink-400 to-rose-500 rounded-full flex items-center justify-center">
                                <Flower size={16} className="text-white" />
                            </div>
                            <span className="font-playfair text-xl font-semibold text-white">Bloom</span>
                        </div>
                        <p className="text-sm leading-relaxed mb-5">
                            Bringing beauty and joy through handcrafted floral arrangements.
                            Freshness guaranteed with every order.
                        </p>
                        <div className="flex gap-2">
                            {["F", "IG", "P"].map((s) => (
                                <a
                                    key={s}
                                    href="#"
                                    aria-label={s}
                                    className="w-9 h-9 bg-gray-800 hover:bg-pink-500 rounded-full flex items-center justify-center text-xs font-medium transition-colors"
                                >
                                    {s}
                                </a>
                            ))}
                        </div>
                    </div>

                    {cols.map((col) => (
                        <div key={col.title}>
                            <h4 className="font-semibold text-white mb-4 text-sm">{col.title}</h4>
                            <ul className="space-y-2.5">
                                {col.links.map((link) => (
                                    <li key={link}>
                                        <a
                                            href="#"
                                            className="text-sm hover:text-pink-400 transition-colors"
                                        >
                                            {link}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>

                <div className="pt-8 border-t border-gray-800 flex flex-col md:flex-row items-center justify-between gap-4">
                    <p className="text-sm">© 2024 Bloom Flower Store. All rights reserved.</p>
                    <p className="text-sm">Made with 🌸 for flower lovers everywhere</p>
                </div>
            </div>
        </footer>
    );
}
