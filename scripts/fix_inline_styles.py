import os

def replace_in_file(path, replacements):
    with open(path, 'r', encoding='utf-8') as f:
        content = f.read()
    original = content
    for old, new in replacements:
        content = content.replace(old, new)
    if content != original:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Fixed {path}")

# StatsBar.tsx
replace_in_file('frontend/src/components/StatsBar.tsx', [
    (
        '''            <span
              className="text-lg sm:text-xl font-bold leading-none"
              style={{ fontFamily: "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace", color: '#FFD700' }}
            >''',
        '''            <span className="text-lg sm:text-xl font-bold leading-none font-mono text-warning">'''
    )
])

# ShareButton.tsx
replace_in_file('frontend/src/components/ShareButton.tsx', [
    (
        '''              : 'top-full right-0 mt-2 origin-top-right slide-in-from-top-2'
          }`}
          style={{ background: '#0A0A0A' }}''',
        '''              : 'top-full right-0 mt-2 origin-top-right slide-in-from-top-2'
          } bg-bg-secondary`}'''
    )
])

# SessionKeyManager.tsx
replace_in_file('frontend/src/components/SessionKeyManager.tsx', [
    (
        '''          ? { color: '#0A0A0A', background: accent, borderColor: accent }''',
        '''          ? { color: 'var(--color-bg-primary)', background: accent, borderColor: accent }'''
    ),
    (
        '''        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="w-3.5 h-3.5" style={{ color: '#FFD700' }} />
          <p className="text-[10px] font-medium uppercase tracking-[0.25em]" style={{ color: '#FFD700' }}>''',
        '''        <div className="flex items-center gap-2 mb-1.5">
          <Zap className="w-3.5 h-3.5 text-warning" />
          <p className="text-[10px] font-medium uppercase tracking-[0.25em] text-warning">'''
    ),
    (
        '''      <button
        type="button"
        onClick={handleApprove}
        disabled={isApproving}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{
          background: isApproving ? '#FFD70080' : '#FFD700',
          color: '#0A0A0A',
        }}
      >''',
        '''      <button
        type="button"
        onClick={handleApprove}
        disabled={isApproving}
        className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed text-bg-primary ${isApproving ? 'bg-warning/50' : 'bg-warning'}`}
      >'''
    ),
    (
        '''<span style={{ color: progressPct > 80 ? '#FFD700' : '#FFD700' }}>''',
        '''<span className="text-warning">'''
    ),
    (
        '''      <button
        type="button"
        onClick={onRenew}
        disabled={isApproving}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60"
        style={{ background: '#FFD700', color: '#0A0A0A' }}
      >''',
        '''      <button
        type="button"
        onClick={onRenew}
        disabled={isApproving}
        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 text-[10px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 bg-warning text-bg-primary"
      >'''
    ),
    (
        '''    <div
      className="relative"
      style={{ background: '#0A0A0A', border: '1px solid rgba(201,168,76,0.15)' }}
    >
      {/* Gold top accent line */}
      <div className="h-[2px] w-full" style={{ background: 'linear-gradient(90deg, #FFD700, transparent)' }} />''',
        '''    <div
      className="relative bg-bg-secondary border border-warning/15"
    >
      {/* Gold top accent line */}
      <div className="h-[2px] w-full bg-gradient-to-r from-warning to-transparent" />'''
    )
])

# ThesisCard.tsx
replace_in_file('frontend/src/components/ThesisCard.tsx', [
    (
        '''                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] mb-0.5" style={{ color: '#FFD700' }}>''',
        '''                  <p className="text-[10px] font-medium uppercase tracking-[0.15em] mb-0.5 text-warning">'''
    ),
    (
        '''                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed"
                  style={{ background: '#FFD700', color: '#0A0A0A' }}
                >''',
        '''                <button
                  type="button"
                  onClick={handleUnlock}
                  disabled={unlocking}
                  className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-[9px] font-bold uppercase tracking-[0.2em] transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed bg-warning text-bg-secondary"
                >'''
    )
])

