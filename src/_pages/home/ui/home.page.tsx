import { Navbar } from "@/src/widgets/navbar";
import { Initializer } from "@/_app/initializer/initializer";
import { HeroSection } from "./sections/hero.section";
import { StatsSection } from "./sections/stats.section";
import { FeaturedProductsSection } from "./sections/featured-products.section";
import { CategoriesSection } from "./sections/categories.section";
import { WhyChooseUsSection } from "./sections/why-choose-us.section";

export function Home() {
    return (
        <Initializer>
            <Navbar />
            <main>
                <HeroSection />
                <StatsSection />
                <FeaturedProductsSection />
                <CategoriesSection />
                <WhyChooseUsSection />
            </main>
        </Initializer>
    );
}

