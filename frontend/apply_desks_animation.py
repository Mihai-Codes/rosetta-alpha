import re

path = "src/components/DesksView.tsx"
with open(path, "r") as f:
    content = f.read()

if "import { motion }" not in content:
    content = content.replace("import React from 'react'", "import React from 'react'\nimport { motion } from 'framer-motion'")

# Replace opening tags and remove animate-rain
content = re.sub(
    r'<div className="([^"]*)animate-rain([^"]*)" style=\{\{ animationDelay: \'0ms\' \}\}>',
    r'<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }} className="\1\2">',
    content
)

content = re.sub(
    r'<div className="([^"]*)animate-rain([^"]*)" style=\{\{ animationDelay: \'150ms\' \}\}>',
    r'<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.3, ease: [0.16, 1, 0.3, 1] }} className="\1\2">',
    content
)

content = re.sub(
    r'<div className="([^"]*)animate-rain([^"]*)" style=\{\{ animationDelay: \'300ms\' \}\}>',
    r'<motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-50px" }} transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }} className="\1\2">',
    content
)

# Clean up empty class strings like className=" mb-6" to className="mb-6"
content = content.replace('className=" ', 'className="')

# Fix closing tags for those specific elements by matching the known structure
content = content.replace(
    '''<RegionPillBar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </div>''',
    '''<RegionPillBar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </motion.div>'''
)

content = content.replace(
    '''<p className="font-display text-xl text-text-tertiary">No desks available</p>
            </div>
          )}
        </div>''',
    '''<p className="font-display text-xl text-text-tertiary">No desks available</p>
            </div>
          )}
        </motion.div>'''
)

content = content.replace(
    '''<PremiumPaywall />}
            </div>
          )}
        </div>''',
    '''<PremiumPaywall />}
            </div>
          )}
        </motion.div>'''
)

content = content.replace(
    '''<AllWeatherChart />
        </div>''',
    '''<AllWeatherChart />
        </motion.div>'''
)

content = content.replace(
    '''<RegionSidebar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </div>''',
    '''<RegionSidebar desks={desks} activeDesk={activeDesk} onSelect={setActiveDesk} />
        </motion.div>'''
)

with open(path, "w") as f:
    f.write(content)

print("Animations applied to DesksView!")
