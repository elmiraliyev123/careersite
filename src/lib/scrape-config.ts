export type ScrapeSource = {
  name: string;
  url: string;
};

export const scrapeSources: ScrapeSource[] = [
  {
    name: "LinkedIn",
    url: "https://www.linkedin.com/jobs/search/?keywords=intern&location=Azerbaijan&position=1&pageNum=0"
  },
  {
    name: "HelloJob",
    url: "https://www.hellojob.az/vakansiyalar?q=intern"
  }
];
