// "use client"

// import { useEffect, useState } from "react"
// import { MapPin, X } from "lucide-react"
// import Image from "next/image"

// interface WelcomeLocationModalProps {
//   isOpen: boolean
//   onClose: () => void
//   onLocationSelect: (location: string) => void
// }

// interface AreaItem {
//   id: string
//   name: string
//   offers: number
// }

// export function WelcomeLocationModal({
//   isOpen,
//   onClose,
//   onLocationSelect,
// }: WelcomeLocationModalProps) {
//   const [areas, setAreas] = useState<AreaItem[]>([])
//   const [loading, setLoading] = useState(false)

//   useEffect(() => {
//     async function fetchAreas() {
//       setLoading(true)
//       const res = await fetch("/api/areas/with-offer-count", {
//         next: { revalidate: 60 }
//       });
//       const data = await res.json()
//       if (data.success) setAreas(data.areas)
//       setLoading(false)
//     }

//     if (isOpen) fetchAreas()
//   }, [isOpen])

//   const handleLocationSelect = (location: string) => {
//     onLocationSelect(location)
//     onClose()
//   }

//   if (!isOpen) return null

//   return (
//     <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm max-h-[65vh] flex flex-col overflow-hidden relative">

//         {/* Image Header */}
//         <div className="relative w-full h-20">
//           <Image
//             src="/images/lifesyle.webp"
//             alt="People enjoying food"
//             fill
//             className="object-cover"
//             priority
//           />
//         </div>

//         {/* Title */}
//         <div className="p-6 pb-5 border-b border-gray-100">
//           <div className="flex items-start justify-between mb-4">
//             <div className="flex-1 pr-4">
//               <h2 className="text-xl font-bold text-gray-900 mb-2 text-left">Save up to 50% when you go out</h2>
//               <p className="text-sm text-gray-600 text-left">The eating out discount app</p>
//             </div>
//             <button
//               onClick={onClose}
//               className="text-gray-400 hover:text-gray-600 transition-colors -mt-1 flex-shrink-0"
//               aria-label="Close"
//             >
//               <X className="w-5 h-5" />
//             </button>
//           </div>
//         </div>

//         {/* Location List */}
//         <div className="flex-1 overflow-y-auto p-4">
//           <div className="space-y-2">

//             {/* Loading skeleton */}
//             {loading &&
//               [1, 2, 3, 4, 5].map((i) => (
//                 <div
//                   key={i}
//                   className="w-full h-12 bg-gray-200 animate-pulse rounded-xl"
//                 />
//               ))}

//             {/* ✅ ALL LOCATIONS OPTION - Always at top when not loading */}
//             {!loading && (
//               <button
//                 onClick={() => handleLocationSelect("")}
//                 className="w-full flex items-center gap-3 px-4 py-3.5
//                   bg-[#eb221c]/5 rounded-xl text-left
//                   hover:bg-[#eb221c]/10 hover:border-[#eb221c]
//                   border-2 border-[#eb221c]/20 transition-all group"
//               >
//                 <MapPin className="w-5 h-5 text-[#eb221c] shrink-0" />
//                 <span className="text-base font-semibold text-[#eb221c]">
//                   All Locations
//                 </span>
//               </button>
//             )}

//             {/* Individual Locations */}
//             {!loading &&
//               areas.map((area) => (
//                 <button
//                   key={area.id}
//                   onClick={() => handleLocationSelect(area.name)}
//                   className="w-full flex items-center gap-3 px-4 py-3.5
//                     bg-gray-50 rounded-xl text-left
//                     hover:bg-[#FFF5F0] hover:border-[#eb221c]
//                     border border-transparent transition-all group"
//                 >
//                   <MapPin className="w-5 h-5 text-[#eb221c] shrink-0" />
//                   <span className="text-base font-medium text-gray-900">
//                     {area.name}
//                   </span>
//                 </button>
//               ))}

//             {!loading && areas.length === 0 && (
//               <p className="text-center text-sm text-gray-500 py-6">
//                 No locations found
//               </p>
//             )}
//           </div>
//         </div>
//       </div>
//     </div>
//   )
// }
"use client"

import { useEffect, useState } from "react"
import { MapPin, X } from "lucide-react"

interface WelcomeLocationModalProps {
  isOpen: boolean
  onClose: () => void
  onLocationSelect: (location: string) => void
}

interface AreaItem {
  id: string
  name: string
  offers: number
}

export function WelcomeLocationModal({
  isOpen,
  onClose,
  onLocationSelect,
}: WelcomeLocationModalProps) {
  const [areas, setAreas] = useState<AreaItem[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    async function fetchAreas() {
      setLoading(true)
      const res = await fetch("/api/areas/with-offer-count", {
        next: { revalidate: 60 }
      });
      const data = await res.json()
      if (data.success) setAreas(data.areas)
      setLoading(false)
    }

    if (isOpen) fetchAreas()
  }, [isOpen])

  const handleLocationSelect = (location: string) => {
    onLocationSelect(location)
    onClose()
  }

  if (!isOpen) return null

  // return (
  //   <div className="fixed inset-0 z-50 flex items-center justify-center">
  //     {/* Backdrop */}
  //     <div
  //       className="absolute inset-0 bg-black/40"
  //       onClick={onClose}
  //       aria-hidden="true"
  //     />

  //     {/* Modal */}
  //     <div className="relative z-10 w-[340px] max-h-[70vh] rounded-2xl bg-white p-6 shadow-xl flex flex-col">
  //       {/* Close button */}
  //       <button
  //         onClick={onClose}
  //         className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
  //         aria-label="Close"
  //       >
  //         <X className="h-5 w-5" />
  //       </button>

  //       {/* Header */}
  //       <h2 className="text-lg font-bold text-gray-900">Choose your location</h2>
  //       <p className="mt-1 text-sm text-gray-500">
  //         Find the best deals near you.
  //       </p>

  //       {/* Location list */}
  //       <div className="mt-5 flex flex-col gap-3 overflow-y-auto flex-1">
  //         {/* Loading skeleton */}
  //         {loading &&
  //           [1, 2, 3, 4, 5].map((i) => (
  //             <div
  //               key={i}
  //               className="w-full h-12 bg-gray-200 animate-pulse rounded-xl"
  //             />
  //           ))}

  //         {/* All Locations Option */}
  //         {!loading && (
  //           <button
  //             onClick={() => handleLocationSelect("")}
  //             className="flex items-center gap-3 rounded-xl border-2 border-[#eb221c]/30 bg-[#eb221c]/5 px-4 py-3 text-left text-sm font-semibold text-[#eb221c] transition-colors hover:bg-[#eb221c]/10 hover:border-[#eb221c]"
  //           >
  //             <MapPin className="h-4 w-4 shrink-0 text-[#eb221c]" />
  //             <span>All Locations</span>
  //           </button>
  //         )}

  //         {/* Individual Locations */}
  //         {!loading &&
  //           areas.map((area) => (
  //             <button
  //               key={area.id}
  //               onClick={() => handleLocationSelect(area.name)}
  //               className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 hover:border-gray-300"
  //             >
  //               <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
  //               <span>{area.name}</span>
  //             </button>
  //           ))}

  //         {/* No locations */}
  //         {!loading && areas.length === 0 && (
  //           <p className="text-center text-sm text-gray-500 py-6">
  //             No locations found
  //           </p>
  //         )}
  //       </div>
  //     </div>
  //   </div>
  // )
  // return (
  //   <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
  //     {/* Backdrop */}
  //     <div
  //       className="absolute inset-0 bg-black/40"
  //       onClick={onClose}
  //       aria-hidden="true"
  //     />
  
  //     {/* Modal */}
  //     <div className="relative z-10 w-[320px] sm:w-[340px] max-h-[59vh] sm:max-h-[70vh] rounded-2xl bg-white p-5 sm:p-6 shadow-xl flex flex-col">
        
  //       {/* Close button */}
  //       <button
  //         onClick={onClose}
  //         className="absolute right-3 top-3 sm:right-4 sm:top-4 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
  //         aria-label="Close"
  //       >
  //         <X className="h-5 w-5" />
  //       </button>
  
  //       {/* Header */}
  //       <h2 className="text-lg font-bold text-gray-900 pr-6">Choose your location</h2>
  //       <p className="mt-1 text-sm text-gray-500">
  //         Find the best deals near you.
  //       </p>
  
  //       {/* Location list */}
  //       <div className="mt-4 sm:mt-5 flex flex-col gap-2.5 sm:gap-3 overflow-y-auto flex-1 scrollbar-hide pr-1">
          
  //         {/* Loading skeleton */}
  //         {loading &&
  //           [1, 2, 3, 4, 5].map((i) => (
  //             <div
  //               key={i}
  //               className="w-full h-11 sm:h-12 bg-gray-200 animate-pulse rounded-xl"
  //             />
  //           ))}
  
  //         {/* All Locations Option */}
  //         {!loading && (
  //           <button
  //             onClick={() => handleLocationSelect("")}
  //             className="flex items-center gap-3 rounded-xl border-2 border-[#eb221c]/30 bg-[#eb221c]/5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-left text-sm font-semibold text-[#eb221c] transition-colors hover:bg-[#eb221c]/10 hover:border-[#eb221c]"
  //           >
  //             <MapPin className="h-4 w-4 shrink-0 text-[#eb221c]" />
  //             <span>All Locations</span>
  //           </button>
  //         )}
  
  //         {/* Individual Locations */}
  //         {!loading &&
  //           areas.map((area) => (
  //             <button
  //               key={area.id}
  //               onClick={() => handleLocationSelect(area.name)}
  //               className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-3.5 sm:px-4 py-2.5 sm:py-3 text-left text-sm text-gray-900 transition-colors hover:bg-gray-50 hover:border-gray-300"
  //             >
  //               <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
  //               <span>{area.name}</span>
  //             </button>
  //           ))}
  
  //         {/* No locations */}
  //         {!loading && areas.length === 0 && (
  //           <p className="text-center text-sm text-gray-500 py-6">
  //             No locations found
  //           </p>
  //         )}
  //       </div>
  //     </div>
  //   </div>
  // )
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
        aria-hidden="true"
      />
  
      {/* Modal */}
      <div className="relative z-10 w-[320px] sm:w-[340px] max-h-[60vh] sm:max-h-[70vh] rounded-2xl bg-white p-4 sm:p-5 shadow-xl flex flex-col">
        
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>
  
        {/* Header - Font size reduced slightly */}
        <h2 className="text-base sm:text-[17px] font-bold text-gray-900 pr-6">Choose your location</h2>
        <p className="mt-0.5 text-xs sm:text-sm text-gray-500">
          Find the best deals near you.
        </p>
  
        {/* Location list - Reduced gap to fit more items */}
        <div className="mt-3 sm:mt-4 flex flex-col gap-2 overflow-y-auto flex-1 scrollbar-hide pr-1">
          
          {/* Loading skeleton */}
          {loading &&
            [1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div
                key={i}
                className="w-full h-9 sm:h-10 bg-gray-200 animate-pulse rounded-lg"
              />
            ))}
  
          {/* All Locations Option */}
          {!loading && (
            <button
              onClick={() => handleLocationSelect("")}
              // Reduced padding (py-2) and changed to rounded-lg for compact look
              className="flex items-center gap-2.5 rounded-lg border-2 border-[#eb221c]/30 bg-[#eb221c]/5 px-3 py-2 text-left text-[13px] sm:text-sm font-semibold text-[#eb221c] transition-colors hover:bg-[#eb221c]/10 hover:border-[#eb221c]"
            >
              <MapPin className="h-4 w-4 shrink-0 text-[#eb221c]" />
              <span>All Locations</span>
            </button>
          )}
  
          {/* Individual Locations */}
          {!loading &&
            areas.map((area) => (
              <button
                key={area.id}
                onClick={() => handleLocationSelect(area.name)}
                // Reduced padding (py-2) and changed to rounded-lg for compact look
                className="flex items-center gap-2.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-left text-[13px] sm:text-sm text-gray-900 transition-colors hover:bg-gray-50 hover:border-gray-300"
              >
                <MapPin className="h-4 w-4 shrink-0 text-gray-400" />
                <span>{area.name}</span>
              </button>
            ))}
  
          {/* No locations */}
          {!loading && areas.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-6">
              No locations found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}