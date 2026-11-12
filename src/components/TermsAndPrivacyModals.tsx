import React from 'react';
import { Language } from '../types';
import { X, ShieldCheck, Scale } from 'lucide-react';

interface ModalProps {
  lang: Language;
  onClose: () => void;
}

export const PrivacyModal: React.FC<ModalProps> = ({ lang, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[85vh] w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#0E1B38] shadow-2xl overflow-hidden text-start">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B132B] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-5 w-5 text-[#C5A880]" />
            <h3 className="font-serif font-bold text-lg text-white">
              {lang === 'en' ? 'Privacy Notice & Data Governance' : 'إشعار الخصوصية وحوكمة البيانات'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs sm:text-sm text-slate-300 space-y-4 leading-relaxed">
          <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-3 text-xs text-[#E8D7B8]">
            {lang === 'en'
              ? 'Notice Version: v1.1-UAE-PDPL · Effective Date: November 2026'
              : 'إصدار الإشعار: v1.1-UAE-PDPL · تاريخ السريان: نوفمبر 2026'}
          </div>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '1. Legislative Compliance' : '1. الامتثال التشريعي'}
          </h4>
          <p>
            {lang === 'en'
              ? 'Kafeely Technologies ("we", "us", or "our") processes personal data in strict accordance with Federal Decree-Law No. 45 of 2021 regarding Personal Data Protection (UAE PDPL). This pre-launch website collects prospective waitlist and interest expressions solely for assessing interest and conducting confidential business discussions.'
              : 'تقوم الكفيل للتقنية بمعالجة البيانات الشخصية وفقاً للمرسوم بقانون اتحادي رقم (45) لسنة 2021 بشأن حماية البيانات الشخصية في دولة الإمارات العربية المتحدة. يتم جمع بيانات الاهتمام بهدف تقييم الإقبال والتواصل المهني السري فقط.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '2. Data Minimisation & Collection Scope' : '2. نطاق جمع البيانات ومبدأ تقليل البيانات'}
          </h4>
          <p>
            {lang === 'en'
              ? 'We collect only the information necessary for qualifying waitlist categories: email address, profile/role classification, district of interest in Dubai, and voluntary property parameters. We do NOT collect bank details, financial statements, or payment card information on this public site.'
              : 'نلتزم بمبدأ جمع الحد الأدنى الضروري من البيانات: البريد الإلكتروني، تصنيف الصفة المهنية، المنطقة المستهدفة في دبي، ومعايير العقار الاختيارية. لا نقوم بجمع أي تفاصيل مصرفية أو بطاقات دفع عبر هذا الموقع العام.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '3. Lawful Basis & Explicit Consent' : '3. الأساس القانوني والموافقة الصريحة'}
          </h4>
          <p>
            {lang === 'en'
              ? 'Processing is conducted based on explicit, opt-in consent recorded at submission. Double opt-in confirmation is required for waitlist activation. You may withdraw marketing consent or request total deletion at any time.'
              : 'تتم المعالجة بناءً على الموافقة الصريحة المسجلة عند تقديم الطلب وتأكيدها عبر التحقق المزدوج. يحق للمستخدم سحب موافقته أو طلب محو بياناته بالكامل في أي وقت.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '4. Data Subject Rights & Right to Erasure' : '4. حقوق أصحاب البيانات وحق المحو'}
          </h4>
          <p>
            {lang === 'en'
              ? 'Under Articles 13-18 of the UAE PDPL, you have the right to access your stored data, rectify inaccuracies, and request immediate permanent erasure. To exercise your rights, contact privacy@kafeely.com or submit an inquiry via our founder portal.'
              : 'بموجب المواد من 13 إلى 18 من قانون حماية البيانات الإماراتي، يحق لك الوصول إلى بياناتك، وتصحيحها، وطلب حذفها نهائياً. لممارسة حقوقك، تواصل عبر privacy@kafeely.com.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '5. Confidentiality & Access (Demo Phase)' : '5. سرية السجلات وصلاحيات الوصول (المرحلة التجريبية)'}
          </h4>
          <p>
            {lang === 'en'
              ? 'During the pre-launch demo phase, submissions are stored only in your own browser (device local storage) and are not transmitted to any server. When the production database is introduced before launch, partner and investor records will be restricted to two named founders with role-based access and access logging, and this notice will be updated before that change takes effect. Personal data is never sold or shared with third-party advertisers.'
              : 'في المرحلة التجريبية الحالية قبل الإطلاق، تُحفظ الطلبات في متصفحك على جهازك فقط (التخزين المحلي) ولا تُرسل إلى أي خادم. وعند تشغيل قاعدة البيانات الإنتاجية قبل الإطلاق، ستُقصَر سجلات الشركاء والمستثمرين على مؤسسين اثنين بالاسم مع ضوابط وصول وتسجيل للدخول، وسيتم تحديث هذا الإشعار قبل ذلك التغيير. ولا تُشارك البيانات الشخصية أبداً مع أطراف تسويقية.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '6. Retention & Storage Location' : '6. مدة الاحتفاظ وموقع التخزين'}
          </h4>
          <p>
            {lang === 'en'
              ? 'Retention (proposed, subject to counsel sign-off): waitlist entries are kept for up to 24 months from sign-up or 12 months after launch, whichever comes first; investor and partner records for up to 24 months from last contact. Storage location: data currently stays on your device only; the production storage region will be chosen deliberately, and any cross-border transfer will be documented in an updated version of this notice before launch.'
              : 'مدة الاحتفاظ (مقترحة رهناً باعتماد المستشار القانوني): تُحفظ طلبات قائمة الانتظار حتى 24 شهراً من التسجيل أو 12 شهراً بعد الإطلاق أيهما أسبق؛ وسجلات الشركاء والمستثمرين حتى 24 شهراً من آخر تواصل. موقع التخزين: تبقى البيانات حالياً على جهازك فقط؛ وسيتم اختيار منطقة التخزين الإنتاجية عمداً وتوثيق أي نقل حدودي في نسخة محدثة من هذا الإشعار قبل الإطلاق.'}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#0B132B] px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#C5A880] px-4 py-2 text-xs font-semibold text-[#0B132B] hover:bg-[#D5BD97]"
          >
            {lang === 'en' ? 'I Understand' : 'موافق'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const TermsModal: React.FC<ModalProps> = ({ lang, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative flex flex-col max-h-[85vh] w-full max-w-3xl rounded-2xl border border-slate-700 bg-[#0E1B38] shadow-2xl overflow-hidden text-start">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0B132B] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Scale className="h-5 w-5 text-[#C5A880]" />
            <h3 className="font-serif font-bold text-lg text-white">
              {lang === 'en' ? 'Terms of Use & Regulatory Disclaimer' : 'الشروط وإخلاء المسؤولية التنظيمية'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded p-1 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs sm:text-sm text-slate-300 space-y-4 leading-relaxed">
          <div className="rounded-lg border border-amber-900/60 bg-amber-950/20 p-4 text-xs text-amber-200 leading-relaxed">
            <span className="font-bold">
              {lang === 'en' ? 'CRITICAL PRE-LAUNCH NOTICE: ' : 'تنبيه تنظيمي هام لمرحلة ما قبل الإطلاق: '}
            </span>
            {lang === 'en'
              ? 'Kafeely is not currently licensed as an insurance company or insurance broker. This website does not constitute an offer of insurance, a financial guarantee, or an offer of securities in any jurisdiction.'
              : 'منصة الكفيل ليست مرخصة حالياً كشركة تأمين أو وسيط تأمين. لا يشكل هذا الموقع عرضاً للتأمين أو ضماناً مالياً أو عرضاً للأوراق المالية في أي اختصاص قضائي.'}
          </div>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '1. Purpose of the Platform' : '1. الغرض من المنصة'}
          </h4>
          <p>
            {lang === 'en'
              ? 'This website serves strictly as an informational and waitlist registration medium to gauge market appetite among Dubai premium landlords, corporate tenants, developers, and potential institutional partners. No binding contracts, policies, or coverage commitments are formed through submission.'
              : 'يقتصر دور هذا الموقع على التعريف العام وجمع طلبات الانضمام لقائمة الانتظار لدراسة رغبات الملاك والمستأجرين والشركاء في دبي. لا يترتب على التسجيل أي التزام تعاقدي أو تغطية قانونية.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '2. Launch Risk-Holding Architecture' : '2. هيكل توزيع المخاطر والإطلاق'}
          </h4>
          <p>
            {lang === 'en'
              ? 'The ultimate risk-holding mechanism (insurance distribution, guarantee, or specialized vehicle) remains subject to regulatory authorisations and sign-off by legal counsel and underwriting capacity providers. Any descriptive materials are conceptual and subject to change.'
              : 'يظل هيكل تحمل المخاطر النهائي (توزيع تأميني أو كفالة أو وعاء متخصص) خاضعاً للموافقات التنظيمية واعتماد المستشار القانوني والشركاء المكتتبين قبل الطرح الفعلي.'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '3. No Securities Offering' : '3. عدم تقديم عروض أوراق مالية'}
          </h4>
          <p>
            {lang === 'en'
              ? 'Nothing on this website constitutes an offer to buy or sell securities, a solicitation of an offer, or financial advice. Investor inquiries are received solely to arrange private, qualified introductory calls under standard non-disclosure agreements (NDAs).'
              : 'لا يتضمن هذا الموقع أي دعوة أو عرض للاكتتاب في أوراق مالية أو تقديم استشارات مالية. يتم تلقي استفسارات المستثمرين لتنسيق اتصالات تعارف خاصة بموجب اتفاقيات سرية (NDA).'}
          </p>

          <h4 className="font-serif font-bold text-white text-base">
            {lang === 'en' ? '4. Intellectual Property & Sources' : '4. الملكية الفكرية وتوثيق المصادر'}
          </h4>
          <p>
            {lang === 'en'
              ? 'All market statistics referenced are cited from documented public sources (Property Monitor, Bayut, CBUAE) with their dates shown on the site.'
              : 'تستند جميع إحصاءات السوق المذكورة إلى مصادر عامة موثقة ومحددة التواريخ معروضة على الموقع.'}
          </p>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-800 bg-[#0B132B] px-6 py-3 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-md bg-[#C5A880] px-4 py-2 text-xs font-semibold text-[#0B132B] hover:bg-[#D5BD97]"
          >
            {lang === 'en' ? 'Accept Terms' : 'الموافقة على الشروط'}
          </button>
        </div>
      </div>
    </div>
  );
};
