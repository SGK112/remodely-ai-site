"""
Remodely AI - Website & AI Visibility Grader
Analyzes websites for SEO, performance, and AI discoverability
"""

import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin
import json
import re
import ssl
import socket
from concurrent.futures import ThreadPoolExecutor, as_completed
import time

class WebsiteGrader:
    def __init__(self, url):
        self.url = self._normalize_url(url)
        self.domain = urlparse(self.url).netloc
        self.html = None
        self.soup = None
        self.headers = None
        self.load_time = None
        self.scores = {}
        self.issues = []
        self.recommendations = []

    def _normalize_url(self, url):
        """Ensure URL has proper format"""
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url
        return url.rstrip('/')

    def fetch_page(self):
        """Fetch the webpage and measure load time"""
        try:
            start = time.time()
            response = requests.get(
                self.url,
                timeout=15,
                headers={
                    'User-Agent': 'Mozilla/5.0 (compatible; RemodelySiteGrader/1.0)'
                },
                allow_redirects=True
            )
            self.load_time = time.time() - start
            self.html = response.text
            self.headers = response.headers
            self.soup = BeautifulSoup(self.html, 'html.parser')
            self.final_url = response.url
            return True
        except Exception as e:
            self.issues.append(f"Could not fetch website: {str(e)}")
            return False

    def check_https(self):
        """Check if site uses HTTPS"""
        score = 0
        if self.url.startswith('https://'):
            score = 100
        else:
            self.issues.append("Website not using HTTPS - security risk")
            self.recommendations.append("Install SSL certificate for HTTPS")
        self.scores['https'] = score
        return score

    def check_mobile_viewport(self):
        """Check for mobile-friendly viewport"""
        score = 0
        viewport = self.soup.find('meta', attrs={'name': 'viewport'})
        if viewport and viewport.get('content'):
            content = viewport.get('content', '')
            if 'width=device-width' in content:
                score = 100
            else:
                score = 50
                self.issues.append("Viewport meta tag exists but may not be optimal")
        else:
            self.issues.append("No viewport meta tag - not mobile friendly")
            self.recommendations.append("Add mobile viewport meta tag")
        self.scores['mobile'] = score
        return score

    def check_meta_tags(self):
        """Check essential meta tags"""
        score = 0
        max_score = 100
        points_per_item = 20

        # Title
        title = self.soup.find('title')
        if title and title.string:
            title_text = title.string.strip()
            if 10 <= len(title_text) <= 60:
                score += points_per_item
            else:
                score += points_per_item // 2
                self.issues.append(f"Title length ({len(title_text)} chars) should be 10-60 characters")
        else:
            self.issues.append("Missing page title")
            self.recommendations.append("Add a descriptive page title (50-60 characters)")

        # Meta description
        meta_desc = self.soup.find('meta', attrs={'name': 'description'})
        if meta_desc and meta_desc.get('content'):
            desc_len = len(meta_desc.get('content', ''))
            if 120 <= desc_len <= 160:
                score += points_per_item
            else:
                score += points_per_item // 2
                self.issues.append(f"Meta description length ({desc_len} chars) should be 120-160 characters")
        else:
            self.issues.append("Missing meta description")
            self.recommendations.append("Add meta description for search results")

        # Open Graph tags
        og_title = self.soup.find('meta', property='og:title')
        og_desc = self.soup.find('meta', property='og:description')
        og_image = self.soup.find('meta', property='og:image')

        og_count = sum([1 for og in [og_title, og_desc, og_image] if og])
        if og_count == 3:
            score += points_per_item
        elif og_count > 0:
            score += points_per_item // 2
            self.issues.append("Incomplete Open Graph tags for social sharing")
        else:
            self.issues.append("No Open Graph tags - poor social media sharing")
            self.recommendations.append("Add Open Graph tags for better social sharing")

        # Canonical URL
        canonical = self.soup.find('link', rel='canonical')
        if canonical:
            score += points_per_item
        else:
            self.issues.append("No canonical URL specified")

        # Keywords (less important now but still counts)
        keywords = self.soup.find('meta', attrs={'name': 'keywords'})
        if keywords and keywords.get('content'):
            score += points_per_item

        self.scores['meta_tags'] = min(score, max_score)
        return self.scores['meta_tags']

    def check_headings(self):
        """Check heading structure"""
        score = 0

        h1_tags = self.soup.find_all('h1')
        h2_tags = self.soup.find_all('h2')
        h3_tags = self.soup.find_all('h3')

        # Should have exactly one H1
        if len(h1_tags) == 1:
            score += 40
        elif len(h1_tags) > 1:
            score += 20
            self.issues.append(f"Multiple H1 tags found ({len(h1_tags)}) - should have only one")
        else:
            self.issues.append("No H1 tag found")
            self.recommendations.append("Add a single H1 tag with your main keyword")

        # Should have H2s for structure
        if len(h2_tags) >= 2:
            score += 30
        elif len(h2_tags) == 1:
            score += 15
        else:
            self.issues.append("No H2 tags for content structure")

        # H3s for sub-sections
        if len(h3_tags) >= 1:
            score += 30

        self.scores['headings'] = score
        return score

    def check_images(self):
        """Check image optimization"""
        images = self.soup.find_all('img')
        if not images:
            self.scores['images'] = 50  # No images isn't necessarily bad
            return 50

        score = 0
        images_with_alt = 0
        images_with_lazy = 0

        for img in images:
            if img.get('alt'):
                images_with_alt += 1
            if img.get('loading') == 'lazy':
                images_with_lazy += 1

        alt_ratio = images_with_alt / len(images) if images else 0
        lazy_ratio = images_with_lazy / len(images) if images else 0

        score = int((alt_ratio * 70) + (lazy_ratio * 30))

        if alt_ratio < 1:
            missing = len(images) - images_with_alt
            self.issues.append(f"{missing} images missing alt text")
            self.recommendations.append("Add descriptive alt text to all images")

        if lazy_ratio < 0.5 and len(images) > 3:
            self.recommendations.append("Add lazy loading to images for better performance")

        self.scores['images'] = score
        return score

    def check_page_speed(self):
        """Basic page speed check"""
        score = 100

        if self.load_time:
            if self.load_time < 1:
                score = 100
            elif self.load_time < 2:
                score = 80
            elif self.load_time < 3:
                score = 60
            elif self.load_time < 5:
                score = 40
                self.issues.append(f"Slow page load time: {self.load_time:.2f}s")
            else:
                score = 20
                self.issues.append(f"Very slow page load: {self.load_time:.2f}s")
                self.recommendations.append("Optimize page speed - compress images, minify CSS/JS")

        self.scores['speed'] = score
        return score

    def check_structured_data(self):
        """Check for Schema.org structured data - CRITICAL for AI visibility"""
        score = 0

        # Look for JSON-LD
        json_ld_scripts = self.soup.find_all('script', type='application/ld+json')

        schema_types = []
        for script in json_ld_scripts:
            try:
                data = json.loads(script.string)
                if isinstance(data, list):
                    for item in data:
                        if '@type' in item:
                            schema_types.append(item['@type'])
                elif '@type' in data:
                    schema_types.append(data['@type'])
            except:
                pass

        # Check for important schema types
        important_schemas = ['LocalBusiness', 'Organization', 'Service', 'Product',
                           'FAQPage', 'HowTo', 'Review', 'AggregateRating']

        found_important = [s for s in schema_types if s in important_schemas]

        if len(found_important) >= 3:
            score = 100
        elif len(found_important) >= 2:
            score = 75
        elif len(found_important) >= 1:
            score = 50
        elif len(json_ld_scripts) > 0:
            score = 25
        else:
            self.issues.append("No structured data (Schema.org) found")
            self.recommendations.append("Add LocalBusiness and Service schema for AI discoverability")

        if 'FAQPage' not in schema_types:
            self.recommendations.append("Add FAQ schema - AI assistants love citing FAQ content")

        self.scores['structured_data'] = score
        self.scores['schema_types'] = schema_types
        return score

    def check_social_presence(self):
        """Check for social media links"""
        score = 0
        social_platforms = {
            'facebook.com': 'Facebook',
            'twitter.com': 'Twitter/X',
            'x.com': 'Twitter/X',
            'instagram.com': 'Instagram',
            'linkedin.com': 'LinkedIn',
            'youtube.com': 'YouTube',
            'tiktok.com': 'TikTok',
            'nextdoor.com': 'Nextdoor',
            'yelp.com': 'Yelp'
        }

        found_platforms = []
        all_links = self.soup.find_all('a', href=True)

        for link in all_links:
            href = link.get('href', '').lower()
            for platform, name in social_platforms.items():
                if platform in href and name not in found_platforms:
                    found_platforms.append(name)

        if len(found_platforms) >= 5:
            score = 100
        elif len(found_platforms) >= 3:
            score = 75
        elif len(found_platforms) >= 1:
            score = 50
        else:
            self.issues.append("No social media links found")
            self.recommendations.append("Add links to social profiles - increases AI visibility")

        # Check specifically for key platforms
        if 'YouTube' not in found_platforms:
            self.recommendations.append("Create YouTube presence - AI heavily indexes video content")
        if 'Yelp' not in found_platforms:
            self.recommendations.append("Claim Yelp listing - important for local AI search")

        self.scores['social'] = score
        self.scores['social_platforms'] = found_platforms
        return score

    def check_contact_info(self):
        """Check for visible contact information - critical for local SEO and AI"""
        score = 0

        page_text = self.soup.get_text().lower()

        # Phone number pattern
        phone_pattern = r'[\+]?[(]?[0-9]{3}[)]?[-\s\.]?[0-9]{3}[-\s\.]?[0-9]{4}'
        has_phone = bool(re.search(phone_pattern, self.html))

        # Email pattern
        email_pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}'
        has_email = bool(re.search(email_pattern, self.html))

        # Address indicators
        address_words = ['street', 'avenue', 'ave', 'road', 'rd', 'boulevard',
                        'blvd', 'suite', 'floor', 'az', 'arizona', 'phoenix']
        has_address = any(word in page_text for word in address_words)

        if has_phone:
            score += 35
        else:
            self.issues.append("No phone number visible on page")
            self.recommendations.append("Display phone number prominently")

        if has_email:
            score += 30
        else:
            self.issues.append("No email address visible")

        if has_address:
            score += 35
        else:
            self.issues.append("No physical address found")
            self.recommendations.append("Add full business address for local AI visibility")

        self.scores['contact'] = score
        return score

    def check_content_quality(self):
        """Check content quality indicators"""
        score = 0

        # Get text content (make a copy to preserve original soup)
        soup_copy = BeautifulSoup(self.html, 'html.parser')
        for tag in soup_copy(['script', 'style', 'nav', 'footer', 'header']):
            tag.decompose()

        text = soup_copy.get_text(separator=' ', strip=True)
        word_count = len(text.split())

        # Word count scoring
        if word_count >= 1000:
            score += 40
        elif word_count >= 500:
            score += 30
        elif word_count >= 300:
            score += 20
        else:
            self.issues.append(f"Low content: only {word_count} words")
            self.recommendations.append("Add more content - aim for 500+ words on main pages")

        # Check for FAQ-style content (great for AI)
        faq_indicators = ['faq', 'frequently asked', 'questions', 'q:', 'a:', 'q&a']
        has_faq = any(ind in text.lower() for ind in faq_indicators)

        if has_faq:
            score += 30
        else:
            self.recommendations.append("Add FAQ section - AI assistants frequently cite Q&A content")

        # Check for service/product descriptions
        service_words = ['service', 'we offer', 'we provide', 'our services',
                        'what we do', 'how we help']
        has_services = any(word in text.lower() for word in service_words)

        if has_services:
            score += 30

        self.scores['content'] = min(score, 100)
        self.scores['word_count'] = word_count
        return self.scores['content']

    def check_business_essentials(self):
        """Check for essential business elements important for home services/contractors"""
        score = 0
        business_factors = []
        text = self.soup.get_text(separator=' ', strip=True).lower()

        # 1. Service area mentions - critical for local businesses
        service_area_patterns = ['serving', 'service area', 'we serve', 'locations',
                                 'phoenix', 'scottsdale', 'mesa', 'tempe', 'chandler',
                                 'gilbert', 'glendale', 'peoria', 'tucson', 'arizona',
                                 'az', 'valley', 'metro', 'surrounding areas']
        has_service_area = any(pattern in text for pattern in service_area_patterns)
        if has_service_area:
            score += 15
            business_factors.append("Service area defined")
        else:
            self.issues.append("No service area mentioned - customers don't know if you serve them")
            self.recommendations.append("Add service area - list cities/regions you serve")

        # 2. Trust signals - licenses, insurance, certifications
        trust_signals = ['licensed', 'insured', 'bonded', 'certified', 'roc#', 'roc #',
                        'license #', 'license:', 'bbb', 'better business', 'accredited',
                        'warranty', 'guarantee', 'satisfaction', 'background check']
        found_trust = [s for s in trust_signals if s in text]
        if len(found_trust) >= 3:
            score += 20
            business_factors.append("Strong trust signals")
        elif len(found_trust) >= 1:
            score += 10
            business_factors.append("Some trust signals")
        else:
            self.issues.append("No trust signals (license, insurance, BBB)")
            self.recommendations.append("Display license number and insurance info prominently")

        # 3. Call-to-action presence
        cta_patterns = ['free quote', 'free estimate', 'get a quote', 'call now', 'call today',
                       'schedule', 'book', 'contact us', 'request', 'get started']
        found_ctas = [c for c in cta_patterns if c in text]
        if len(found_ctas) >= 2:
            score += 15
            business_factors.append("Clear calls-to-action")
        elif len(found_ctas) >= 1:
            score += 8
        else:
            self.issues.append("No clear call-to-action for leads")
            self.recommendations.append("Add 'Get a Free Quote' buttons throughout the page")

        # 4. Portfolio/project gallery indicators
        portfolio_indicators = ['portfolio', 'gallery', 'our work', 'projects', 'before and after',
                               'recent work', 'completed', 'showcase']
        has_portfolio = any(p in text for p in portfolio_indicators)
        if has_portfolio:
            score += 15
            business_factors.append("Portfolio/gallery present")
        else:
            self.recommendations.append("Add project gallery - visuals build trust for contractors")

        # 5. Reviews/testimonials
        review_indicators = ['review', 'testimonial', 'customer said', 'clients say',
                            'what our', 'rated', 'stars', '5 star', 'five star']
        has_reviews = any(r in text for r in review_indicators)
        if has_reviews:
            score += 15
            business_factors.append("Reviews/testimonials shown")
        else:
            self.recommendations.append("Add customer testimonials - builds trust and AI visibility")

        # 6. Specific services listed
        service_types = ['remodel', 'renovation', 'kitchen', 'bathroom', 'flooring',
                        'painting', 'plumbing', 'hvac', 'electrical', 'roofing',
                        'landscaping', 'deck', 'patio', 'addition', 'repair',
                        'installation', 'maintenance', 'construction']
        found_services = [s for s in service_types if s in text]
        if len(found_services) >= 4:
            score += 20
            business_factors.append(f"Services clearly listed ({len(found_services)}+ types)")
        elif len(found_services) >= 2:
            score += 10
        else:
            self.issues.append("Services not clearly defined")
            self.recommendations.append("List all your services with detailed descriptions")

        self.scores['business_essentials'] = min(score, 100)
        self.scores['business_factors'] = business_factors
        return score

    def check_ai_visibility(self):
        """
        AI Visibility Score - How likely AI assistants will find and cite this business
        This is the NEW metric that matters as search shifts to AI
        """
        ai_score = 0
        ai_factors = []

        # Structured data is HUGE for AI
        if self.scores.get('structured_data', 0) >= 75:
            ai_score += 20
            ai_factors.append("Strong structured data")
        elif self.scores.get('structured_data', 0) >= 50:
            ai_score += 12

        # FAQ content gets cited by AI
        if 'FAQPage' in self.scores.get('schema_types', []):
            ai_score += 12
            ai_factors.append("FAQ schema present")

        # Social presence = more training data
        social_count = len(self.scores.get('social_platforms', []))
        if social_count >= 4:
            ai_score += 15
            ai_factors.append("Strong social presence")
        elif social_count >= 2:
            ai_score += 8

        # YouTube specifically
        if 'YouTube' in self.scores.get('social_platforms', []):
            ai_score += 8
            ai_factors.append("YouTube presence")

        # Contact info = legitimate business
        if self.scores.get('contact', 0) >= 80:
            ai_score += 10
            ai_factors.append("Complete contact info")
        elif self.scores.get('contact', 0) >= 50:
            ai_score += 5

        # Content quality
        if self.scores.get('word_count', 0) >= 500:
            ai_score += 8

        # HTTPS
        if self.scores.get('https', 0) == 100:
            ai_score += 5

        # Business essentials - critical for local service businesses
        business_score = self.scores.get('business_essentials', 0)
        if business_score >= 70:
            ai_score += 15
            ai_factors.append("Strong business presence")
        elif business_score >= 40:
            ai_score += 8

        # Reviews/testimonials boost AI visibility
        if 'Reviews/testimonials shown' in self.scores.get('business_factors', []):
            ai_score += 7
            ai_factors.append("Customer reviews visible")

        self.scores['ai_visibility'] = min(ai_score, 100)
        self.scores['ai_factors'] = ai_factors

        if ai_score < 50:
            self.recommendations.insert(0, "PRIORITY: Improve AI visibility to be found by ChatGPT, Grok, etc.")

        return ai_score

    def calculate_overall_score(self):
        """Calculate weighted overall score"""
        weights = {
            'ai_visibility': 0.22,  # Most important for the future
            'business_essentials': 0.15,  # Critical for home services
            'structured_data': 0.12,
            'meta_tags': 0.10,
            'mobile': 0.08,
            'speed': 0.07,
            'headings': 0.06,
            'content': 0.06,
            'social': 0.05,
            'contact': 0.05,
            'https': 0.02,
            'images': 0.02
        }

        total = 0
        for key, weight in weights.items():
            score = self.scores.get(key, 0)
            if isinstance(score, (int, float)):
                total += score * weight

        self.scores['overall'] = round(total)
        return self.scores['overall']

    def get_grade(self, score):
        """Convert score to letter grade"""
        if score >= 90:
            return 'A'
        elif score >= 80:
            return 'B'
        elif score >= 70:
            return 'C'
        elif score >= 60:
            return 'D'
        else:
            return 'F'

    def run_full_analysis(self):
        """Run complete website analysis"""
        if not self.fetch_page():
            return {
                'success': False,
                'error': 'Could not fetch website',
                'url': self.url
            }

        # Run all checks
        self.check_https()
        self.check_mobile_viewport()
        self.check_meta_tags()
        self.check_headings()
        self.check_images()
        self.check_page_speed()
        self.check_structured_data()
        self.check_social_presence()
        self.check_contact_info()
        self.check_content_quality()
        self.check_business_essentials()  # Home services specific checks
        self.check_ai_visibility()
        self.calculate_overall_score()

        return {
            'success': True,
            'url': self.url,
            'domain': self.domain,
            'scores': {
                'overall': self.scores.get('overall', 0),
                'overall_grade': self.get_grade(self.scores.get('overall', 0)),
                'ai_visibility': self.scores.get('ai_visibility', 0),
                'ai_visibility_grade': self.get_grade(self.scores.get('ai_visibility', 0)),
                'business_essentials': self.scores.get('business_essentials', 0),
                'seo': {
                    'meta_tags': self.scores.get('meta_tags', 0),
                    'headings': self.scores.get('headings', 0),
                    'structured_data': self.scores.get('structured_data', 0),
                },
                'technical': {
                    'https': self.scores.get('https', 0),
                    'mobile': self.scores.get('mobile', 0),
                    'speed': self.scores.get('speed', 0),
                    'images': self.scores.get('images', 0),
                },
                'presence': {
                    'social': self.scores.get('social', 0),
                    'contact': self.scores.get('contact', 0),
                    'content': self.scores.get('content', 0),
                }
            },
            'details': {
                'load_time': round(self.load_time, 2) if self.load_time else None,
                'word_count': self.scores.get('word_count', 0),
                'social_platforms': self.scores.get('social_platforms', []),
                'schema_types': self.scores.get('schema_types', []),
                'ai_factors': self.scores.get('ai_factors', []),
                'business_factors': self.scores.get('business_factors', []),
            },
            'issues': self.issues[:10],  # Top 10 issues
            'recommendations': self.recommendations[:8],  # Top 8 recommendations
        }


def grade_website(url):
    """Main function to grade a website"""
    grader = WebsiteGrader(url)
    return grader.run_full_analysis()


# For testing
if __name__ == '__main__':
    import sys

    if len(sys.argv) > 1:
        url = sys.argv[1]
    else:
        url = 'https://remodely.ai'

    print(f"\nAnalyzing: {url}\n")
    result = grade_website(url)

    if result['success']:
        print(f"Overall Score: {result['scores']['overall']}/100 ({result['scores']['overall_grade']})")
        print(f"AI Visibility: {result['scores']['ai_visibility']}/100 ({result['scores']['ai_visibility_grade']})")
        print(f"\nLoad Time: {result['details']['load_time']}s")
        print(f"Word Count: {result['details']['word_count']}")
        print(f"\nSocial Platforms: {', '.join(result['details']['social_platforms']) or 'None found'}")
        print(f"Schema Types: {', '.join(result['details']['schema_types']) or 'None found'}")
        print(f"\n--- Top Issues ---")
        for issue in result['issues']:
            print(f"  - {issue}")
        print(f"\n--- Recommendations ---")
        for rec in result['recommendations']:
            print(f"  - {rec}")
    else:
        print(f"Error: {result.get('error')}")
