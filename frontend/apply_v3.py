import re

# --- HeroSection.tsx ---
with open('src/components/HeroSection.tsx', 'r') as f:
    hero = f.read()

# Subtitle one line clamp
hero = re.sub(
    r'<p\s+data-reveal-id="subtitle"\s+className={`.*?`}\s*>\s*Dalio\'s All Weather discipline.*?</p>',
    """<p
          data-reveal-id="subtitle"
          className={`text-[clamp(0.6rem,1.5vw,1.25rem)] text-text-secondary font-light w-full whitespace-nowrap mb-12 transition-all duration-1000 delay-150 ${
            visible.subtitle ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
          }`}
        >
          Dalio's All Weather discipline, reimagined for every language. Five regional AI analysts. One verifiable thesis.
        </p>""",
    hero, flags=re.DOTALL
)

# Region dots intense glow
hero = hero.replace(
    'hover:border-brand-red hover:shadow-[0_0_20px_rgba(216,43,43,0.6)] transition-all duration-300 cursor-default',
    'hover:border-brand-red hover:shadow-[0_0_32px_rgba(216,43,43,0.9)] transition-all duration-300 cursor-pointer'
)

# Latest trace enhancement
hero = hero.replace(
    'border border-brand-red/60 shadow-[0_0_15px_rgba(216,43,43,0.3)]',
    'border border-brand-red shadow-[0_0_24px_rgba(216,43,43,0.6)]'
)

with open('src/components/HeroSection.tsx', 'w') as f:
    f.write(hero)


# --- Layout.tsx ---
with open('src/components/Layout.tsx', 'r') as f:
    layout = f.read()

# Aristotle Matrix Quote
new_quote = """function QuoteMatrix() {
  const [isGreek, setIsGreek] = React.useState(true)
  React.useEffect(() => {
    const i = setInterval(() => setIsGreek(g => !g), 5000)
    return () => clearInterval(i)
  }, [])
  return (
    <span className="italic text-text-secondary text-lg md:text-xl font-display tracking-wide relative inline-flex items-center justify-center min-w-[500px] h-[36px]">
      <span className={`absolute transition-all duration-1000 ease-in-out ${isGreek ? 'opacity-100 blur-0 scale-100 drop-shadow-