import HomePage from "@/app/(pages)/home/page";
import UniversalLayout from "@/app/(pages)/layout";

export default function EntryPoint() {
  return (
    <UniversalLayout>
        <HomePage />
    </UniversalLayout>
  );
}
