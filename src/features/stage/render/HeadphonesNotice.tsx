import Icon from "@/components/Icon";
import { Notice } from "@/components/ui";

/** The "Use headphones" notice of a note: why speakers get in the microphone's way. The same words wherever it is put. */
export default function HeadphonesNotice() {
  return (
    <Notice tone="warn" icon={<Icon name="headphones" size={16} />}>
      <strong className="font-semibold text-slate-100">Use headphones.</strong> The microphone hears everything in the room. On speakers it also hears the app&apos;s sound, and can take it for your playing or singing.
    </Notice>
  );
}
