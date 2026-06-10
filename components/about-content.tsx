"use client"

import Image from "next/image"
import Link from "next/link"
import { motion } from "framer-motion"

const ease = [0.32, 0.72, 0, 1] as const

export function AboutContent() {
  return (
    <main className="px-4 py-6 md:px-10 md:py-10">
      <header className="flex items-start justify-between">
        <Link
          href="/"
          className="text-xs font-bold tracking-widest transition-opacity hover:opacity-50 md:text-sm"
        >
          {"[ ← INDEX ]"}
        </Link>
        <span className="text-xs font-medium tracking-wide md:text-sm">
          {"[2025]"}
        </span>
      </header>

      <div className="mt-10 overflow-hidden md:mt-16">
        <motion.h1
          initial={{ y: "105%" }}
          animate={{ y: 0 }}
          transition={{ duration: 0.7, ease }}
          className="text-6xl leading-[0.9] font-extrabold tracking-tighter lowercase md:text-9xl"
        >
          about
        </motion.h1>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-10 md:mt-20 md:grid-cols-5 md:gap-12">
        <motion.figure
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease }}
          className="relative aspect-[4/5] w-full overflow-hidden bg-black md:col-span-2"
        >
          <Image
            src="/photos/portraits-5.png"
            alt="Silhouette of a musician against a bright window"
            fill
            sizes="(max-width: 768px) 100vw, 40vw"
            className="object-cover grayscale"
          />
        </motion.figure>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.35, ease }}
          className="flex flex-col justify-between gap-10 md:col-span-3"
        >
          <div className="flex flex-col gap-6 text-sm leading-relaxed text-muted-foreground md:max-w-lg md:text-base">
            <p className="text-lg font-medium text-foreground text-pretty md:text-xl">
              {"I'm Tushar Gaurav. By day I'm a software developer — I build RoboGPT at Orangewood Labs, making robots understand what you're saying to them. This site is what happens when I close the laptop."}
            </p>
            <p>
              {"I grew up in Dhanbad, Jharkhand, where my curiosity for how things work started early. Photography is how that curiosity looks outward. Code is precise and deterministic; the street is neither. That contrast is the whole appeal."}
            </p>
            <p>
              {"I'm an introvert. Pointing a camera at a stranger terrifies me, and most of these photos started with a conversation I almost didn't have. I shoot mostly in black and white because it forces me to look at light, shape, and the moment — not the noise."}
            </p>
            <p>
              {"This isn't a portfolio in the professional sense. It's a journal. A record of places I walked through, people I met, and moments I didn't expect but couldn't let pass."}
            </p>
          </div>

          <div className="flex flex-col gap-3">
            <p className="text-xs font-bold tracking-widest uppercase">
              Elsewhere
            </p>
            <div className="flex flex-wrap gap-6 text-sm font-bold tracking-widest">
              <a
                href="https://www.tushgaurav.com"
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-50"
              >
                {"[ TUSHGAURAV.COM ]"}
              </a>
              <a
                href="https://www.tushgaurav.com/about"
                target="_blank"
                rel="noreferrer"
                className="transition-opacity hover:opacity-50"
              >
                {"[ MORE ABOUT ME ]"}
              </a>
            </div>
          </div>
        </motion.div>
      </div>

      <footer className="mt-16 flex items-center justify-between md:mt-24">
        <span className="text-xs font-bold tracking-widest md:text-sm">
          TUSHAR
        </span>
        <span className="text-xs font-bold tracking-widest md:text-sm">
          GAURAV
        </span>
      </footer>
    </main>
  )
}
