import { LandingNavbar } from "./landing-navbar";
import {
    HeroWidget,
    TrustBarWidget,
    CategoriesWidget,
    FeaturedProductsWidget,
    HowItWorksWidget,
    TestimonialsWidget,
    CustomBouquetWidget,
    NewsletterWidget,
    FooterWidget,
} from "@/widgets/index";

export function Home() {
    return (
        <main className="overflow-hidden">
            <LandingNavbar />
            <HeroWidget />
            <TrustBarWidget />
            <CategoriesWidget />
            <FeaturedProductsWidget />
            <HowItWorksWidget />
            <TestimonialsWidget />
            <CustomBouquetWidget />
            <NewsletterWidget />
            <FooterWidget />
        </main>
    );
}



