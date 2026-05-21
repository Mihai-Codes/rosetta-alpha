import re

path = "src/components/AboutView.tsx"
with open(path, "r") as f:
    about = f.read()

old_blocks = r'''<div key=\{i\} className="group flex flex-col md:flex-row items-start md:items-center gap-3 p-4 bg-white/\[0\.01\] border border-white/\[0\.03\] rounded-xl transition-all duration-700 hover:bg-brand-red/\[0\.01\] hover:border-brand-red/10">
                  <div className="md:w-\[130px\] shrink-0">
                    <p className="text-\[10px\] uppercase tracking-\[0\.3em\] text-brand-red/50 group-hover:text-brand-red transition-all duration-500 font-bold">\{item\.label\}</p>
                  </div>
                  <div className="md:w-\[170px\] shrink-0 md:border-l border-brand-red/30 md:pl-4">
                    <p className="text-sm font-display text-text-primary tracking-tight leading-snug">\{item\.assets\}</p>
                  </div>
                  <div className="flex-1 md:border-l border-brand-red/30 md:pl-6">
                    <p className="text-\[13px\] text-text-secondary font-light leading-normal tracking-wide text-left">\{item\.desc\}</p>
                  </div>
                </div>'''

new_blocks = r'''<div key={i} className="group flex flex-col md:flex-row items-stretch gap-0 p-0 bg-[#0A0A0A] border border-brand-red/20 rounded-none transition-all duration-700 hover:bg-brand-red/[0.05] hover:border-brand-red/40 hover:shadow-[0_0_15px_rgba(216,43,43,0.15)]">
                  <div className="md:w-[150px] shrink-0 p-4 flex items-center">
                    <p className="text-[10px] uppercase tracking-[0.3em] text-brand-red/50 group-hover:text-brand-red transition-all duration-500 font-bold">{item.label}</p>
                  </div>
                  <div className="md:w-[200px] shrink-0 md:border-l border-t md:border-t-0 border-brand-red/30 p-4 flex items-center">
                    <p className="text-sm font-display text-text-primary tracking-tight leading-snug">{item.assets}</p>
                  </div>
                  <div className="flex-1 md:border-l border-t md:border-t-0 border-brand-red/30 p-4 flex items-center">
                    <p className="text-[13px] text-text-secondary font-light leading-normal tracking-wide text-left">{item.desc}</p>
                  </div>
                </div>'''

about = re.sub(old_blocks, new_blocks, about)

with open(path, "w") as f:
    f.write(about)
print("About page inner boxes adjusted!")
