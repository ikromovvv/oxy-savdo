'use client';

import { useEffect, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import { playSfx, setSoundEnabled, soundEnabled } from '@/lib/sfx';

// Tovushlarni yoqish/o'chirish tugmasi (header).
export default function SoundToggle() {
  const [on, setOn] = useState(true);

  useEffect(() => {
    setOn(soundEnabled());
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    setSoundEnabled(next);
    if (next) playSfx('open');
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? 'Tovushni o\'chirish' : 'Tovushni yoqish'}
      title={on ? 'Tovush: yoqilgan' : 'Tovush: o\'chirilgan'}
      className="hidden h-10 w-10 place-items-center rounded-xl border border-line text-muted transition hover:border-white/40 hover:text-white sm:grid"
    >
      {on ? <Volume2 className="h-[18px] w-[18px]" /> : <VolumeX className="h-[18px] w-[18px]" />}
    </button>
  );
}
