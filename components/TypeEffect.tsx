"use client"

import { useState, useEffect } from "react"

export default function TypeEffect() {
  const text = "EAT. DRINK. SAVE."
  const [displayedText, setDisplayedText] = useState("")
  const [index, setIndex] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    let timeout: NodeJS.Timeout

    if (!isDeleting && index < text.length) {
      // typing forward
      timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[index])
        setIndex(index + 1)
      }, 180) // typing speed
    } else if (isDeleting && index > 0) {
      // deleting backward
      timeout = setTimeout(() => {
        setDisplayedText((prev) => prev.slice(0, -1))
        setIndex(index - 1)
      }, 120) // deleting speed (slightly faster)
    } else if (!isDeleting && index === text.length) {
      // wait, then start deleting
      timeout = setTimeout(() => {
        setIsDeleting(true)
      }, 1200) // delay before delete starts
    } else if (isDeleting && index === 0) {
      // wait, then start typing again
      timeout = setTimeout(() => {
        setIsDeleting(false)
      }, 800) // delay before retyping
    }

    return () => clearTimeout(timeout)
  }, [index, isDeleting])

  return (
    <div className="mb-10 text-center">
      <h2
        className="text-3xl font-bold tracking-tighter md:text-4xl"
        style={{ color: "#eb221c", minHeight: "2.5rem" }}
      >
        {displayedText}
        <span className="animate-blink">|</span>
      </h2>
      <p className="mt-2 text-gray-500 md:text-lg">
       Your excuse to go out
      </p>
    </div>
  )
}