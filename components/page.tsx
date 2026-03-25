"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FlavourSection } from "@/components/flavour-section"
import { FomoBar } from "@/components/fomo-bar"
import { CategorySection } from "@/components/category-section"
import { UnsubscribedRestaurantCard } from "@/components/unsubscribed-restaurant-card"
import { UnsubscribedNationwideCard } from "@/components/unsubscribed-nationwide-card"
import { StickyCTA } from "@/components/sticky-cta"
import { LocationPopup } from "@/components/location-popup"
import { UnsubscribedAllRestaurantsCard } from "@/components/unsubscribed-all-restaurants-card"

const todaysDeals = [
  {
    id: 1,
    name: "The Black Bull on Blandford St",
    cuisine: "British • Steakhouse",
    location: "Marylebone, London",
    image: "/british-steak-restaurant.webp",
    offers: [
      { discount: "50% OFF", unlimited: false, remainingCount: 2 },
      { discount: "2-FOR-1", unlimited: true },
      { discount: "25% OFF", unlimited: false, remainingCount: 5 },
    ],
  },
  {
    id: 2,
    name: "The Three Halves",
    cuisine: "American • Burgers",
    location: "Holborn, London",
    image: "/restaurant-interior-bar.webp",
    offers: [
      { discount: "25% OFF", unlimited: true },
    ],
  },
  {
    id: 3,
    name: "Traditional @ The West Pearl ltd",
    cuisine: "Traditional British",
    location: "Westminster, London",
    image: "/traditional-british-fish-chips.webp",
    offers: [
      { discount: "20% OFF", unlimited: false, remainingCount: 3 },
      { discount: "15% OFF", unlimited: true },
    ],
  },
  {
    id: 4,
    name: "Bar Fresco",
    cuisine: "Italian • Pizza",
    location: "Kensington, London",
    image: "/italian-bar-restaurant.webp",
    offers: [
      { discount: "20% OFF", unlimited: true },
      { discount: "15% OFF", unlimited: true },
      { discount: "2-FOR-1", unlimited: false, remainingCount: 4 },
      { discount: "10% OFF", unlimited: true },
    ],
  },
]

const italianRestaurants = [
  {
    id: 5,
    name: "Tuscany Kitchen",
    cuisine: "Italian • Pasta",
    location: "Soho, London",
    image: "/italian-pasta-restaurant.webp",
    offers: [
      { discount: "15% OFF", unlimited: true },
      { discount: "2-FOR-1", unlimited: false, remainingCount: 7 },
    ],
  },
  {
    id: 6,
    name: "Bella Roma",
    cuisine: "Italian • Pizza",
    location: "Covent Garden, London",
    image: "/italian-pizza-restaurant.webp",
    offers: [
      { discount: "2-FOR-1", unlimited: false, remainingCount: 4 },
    ],
  },
  {
    id: 7,
    name: "Il Ristorante",
    cuisine: "Italian • Fine Dining",
    location: "Kensington, London",
    image: "/italian-fine-dining.webp",
    offers: [
      { discount: "30% OFF", unlimited: true },
      { discount: "25% OFF", unlimited: true },
      { discount: "20% OFF", unlimited: false, remainingCount: 2 },
    ],
  },
]

const mexicanRestaurants = [
  {
    id: 8,
    name: "Tacos Maravillosos",
    cuisine: "Mexican • Tacos",
    location: "Camden, London",
    image: "/vibrant-mexican-tacos.webp",
    offers: [
      { discount: "15% OFF", unlimited: true },
    ],
  },
  {
    id: 9,
    name: "Taco Bar Bandidos",
    cuisine: "Mexican • Street Food",
    location: "Shoreditch, London",
    image: "/mexican-street-food.webp",
    offers: [
      { discount: "20% OFF", unlimited: false, remainingCount: 3 },
      { discount: "2-FOR-1", unlimited: true },
    ],
  },
  {
    id: 10,
    name: "Taco Bar Pedritos",
    cuisine: "Mexican • Cantina",
    location: "Brixton, London",
    image: "/colorful-mexican-restaurant.webp",
    offers: [
      { discount: "25% OFF", unlimited: true },
      { discount: "15% OFF", unlimited: false, remainingCount: 6 },
      { discount: "10% OFF", unlimited: true },
    ],
  },
]

const cocktailBars = [
  {
    id: 11,
    name: "Kings Cross Pintxos",
    cuisine: "Spanish • Cocktails",
    location: "Kings Cross, London",
    image: "/cocktail-bar-interior.webp",
    offers: [
      { discount: "2-FOR-1", unlimited: false, remainingCount: 7 },
      { discount: "30% OFF", unlimited: true },
    ],
  },
  {
    id: 12,
    name: "The Cocktail Lab",
    cuisine: "Cocktail Bar",
    location: "Shoreditch, London",
    image: "/craft-cocktails-bar.webp",
    offers: [
      { discount: "40% OFF", unlimited: true },
    ],
  },
  {
    id: 13,
    name: "Moonlight Lounge",
    cuisine: "Cocktails & Wine Bar",
    location: "Mayfair, London",
    image: "/luxury-cocktail-lounge.webp",
    offers: [
      { discount: "30% OFF", unlimited: true },
      { discount: "2-FOR-1", unlimited: false, remainingCount: 5 },
      { discount: "25% OFF", unlimited: true },
    ],
  },
]

const breakfastPlaces = [
  {
    id: 14,
    name: "Morning Glory Cafe",
    cuisine: "Brunch • Coffee",
    location: "Notting Hill, London",
    image: "/breakfast-cafe-brunch.webp",
    offers: [
      { discount: "20% OFF", unlimited: true },
    ],
  },
  {
    id: 15,
    name: "The Early Bird",
    cuisine: "Breakfast • Pancakes",
    location: "Angel, London",
    image: "/pancakes-breakfast.webp",
    offers: [
      { discount: "15% OFF", unlimited: false, remainingCount: 4 },
      { discount: "2-FOR-1", unlimited: true },
    ],
  },
  {
    id: 16,
    name: "Sunrise Diner",
    cuisine: "American Breakfast",
    location: "Victoria, London",
    image: "/american-breakfast-diner.webp",
    offers: [
      { discount: "25% OFF", unlimited: true },
      { discount: "20% OFF", unlimited: false, remainingCount: 8 },
    ],
  },
]

const dessertPlaces = [
  {
    id: 17,
    name: "Mezzaluna Caffe Misto",
    cuisine: "Desserts • Coffee",
    location: "Soho, London",
    image: "/coffee-latte-art.webp",
    offers: [
      { discount: "20% OFF", unlimited: true },
      { discount: "15% OFF", unlimited: false, remainingCount: 9 },
    ],
  },
  {
    id: 18,
    name: "Sweet Tooth Paradise",
    cuisine: "Dessert Bar • Cakes",
    location: "Chelsea, London",
    image: "/dessert-cake-pastries.webp",
    offers: [
      { discount: "15% OFF", unlimited: false, remainingCount: 3 },
    ],
  },
]

const nationwideRestaurants = [
  {
    id: 101,
    name: "Pizza Express",
    image: "/italian-pizza-restaurant.webp",
    offers: [
      { discount: "30% OFF", unlimited: true },
      { discount: "2-FOR-1", unlimited: true },
    ],
  },
  {
    id: 102,
    name: "Wagamama",
    image: "/italian-pasta-restaurant.webp",
    offers: [
      { discount: "20% OFF", unlimited: true },
    ],
  },
  {
    id: 103,
    name: "Zizzi",
    image: "/italian-bar-restaurant.webp",
    offers: [
      { discount: "25% OFF", unlimited: true },
      { discount: "15% OFF", unlimited: true },
      { discount: "10% OFF", unlimited: false, remainingCount: 5 },
    ],
  },
  {
    id: 104,
    name: "Prezzo",
    image: "/italian-fine-dining.webp",
    offers: [
      { discount: "2-FOR-1", unlimited: false, remainingCount: 6 },
    ],
  },
  {
    id: 105,
    name: "Bella Italia",
    image: "/vibrant-mexican-tacos.webp",
    offers: [
      { discount: "15% OFF", unlimited: true },
      { discount: "20% OFF", unlimited: false, remainingCount: 2 },
    ],
  },
]

const allRestaurants = [
  ...todaysDeals,
  ...italianRestaurants,
  ...mexicanRestaurants,
  ...cocktailBars,
  ...breakfastPlaces,
  ...dessertPlaces,
]

export default function UnsubscribedPage() {
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null)
  const [showLocationPopup, setShowLocationPopup] = useState(false)

  useEffect(() => {
    const hasSelectedLocation = sessionStorage.getItem("selectedLocation")
    if (!hasSelectedLocation) {
      setShowLocationPopup(true)
    } else {
      setSelectedLocation(hasSelectedLocation)
    }
  }, [])

  const handleLocationSelect = (location: string) => {
    setSelectedLocation(location)
    sessionStorage.setItem("selectedLocation", location)
    setShowLocationPopup(false)
  }

  return (
    <main className="min-h-screen bg-[#FFFBF7] pb-20">
      {showLocationPopup && <LocationPopup onLocationSelect={handleLocationSelect} />}

      <Header />

      <HeroSection />

      <FlavourSection />

      <FomoBar />

      <div className="py-5 space-y-5">
        <CategorySection title="Today's Deals" isPrimary={true}>
          {todaysDeals.map((restaurant) => (
            <UnsubscribedRestaurantCard
              key={restaurant.id}
              {...restaurant}
              isLarger={true}
            />
          ))}
        </CategorySection>

        <CategorySection title="Available everywhere">
          {nationwideRestaurants.map((restaurant) => (
            <UnsubscribedNationwideCard key={restaurant.id} {...restaurant} />
          ))}
        </CategorySection>

        <CategorySection title="Italian">
          {italianRestaurants.map((restaurant) => (
            <UnsubscribedRestaurantCard key={restaurant.id} {...restaurant} />
          ))}
        </CategorySection>

        <CategorySection title="Mexican">
          {mexicanRestaurants.map((restaurant) => (
            <UnsubscribedRestaurantCard key={restaurant.id} {...restaurant} />
          ))}
        </CategorySection>

        <CategorySection title="Cocktails & Bars">
          {cocktailBars.map((restaurant) => (
            <UnsubscribedRestaurantCard key={restaurant.id} {...restaurant} />
          ))}
        </CategorySection>

        <CategorySection title="Breakfast & Brunch">
          {breakfastPlaces.map((restaurant) => (
            <UnsubscribedRestaurantCard key={restaurant.id} {...restaurant} />
          ))}
        </CategorySection>

        <CategorySection title="Desserts">
          {dessertPlaces.map((restaurant) => (
            <UnsubscribedRestaurantCard key={restaurant.id} {...restaurant} />
          ))}
        </CategorySection>
      </div>

      <section className="px-4 py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">All Restaurants</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {allRestaurants.map((restaurant) => (
            <UnsubscribedAllRestaurantsCard key={restaurant.id} {...restaurant} />
          ))}
        </div>
      </section>

      <StickyCTA />
    </main>
  )
}
