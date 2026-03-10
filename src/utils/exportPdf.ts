import { Project } from '../types';

export async function exportProjectToPdf(project: Project): Promise<void> {
  const html2pdf = (await import('html2pdf.js')).default;

  const chapters = project.outline?.chapters || [];

  const chaptersHtml = chapters
    .map(
      (ch, i) => `
      <div class="chapter" style="page-break-before: ${i === 0 ? 'auto' : 'always'}; margin-bottom: 48px;">
        <h2 style="font-size: 26px; font-weight: 700; color: #111; border-bottom: 2px solid #e5e7eb; padding-bottom: 12px; margin-bottom: 24px;">
          ${ch.title}
        </h2>
        <div class="chapter-content" style="font-size: 15px; line-height: 1.8; color: #374151;">
          ${ch.content || `<p style="color: #9ca3af; font-style: italic;">Conteúdo não gerado.</p>`}
        </div>
      </div>
    `
    )
    .join('');

  const now = new Date().toLocaleDateString('pt-BR', { year: 'numeric', month: 'long', day: 'numeric' });

  const fullHtml = `
    <div style="font-family: 'Georgia', serif; max-width: 720px; margin: 0 auto; padding: 0 24px;">
      <!-- Cover Page -->
      <div style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; page-break-after: always;">
        <p style="font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: #6b7280; margin-bottom: 32px; font-family: 'Arial', sans-serif;">
          ${project.briefing?.material_type || project.type}
        </p>
        <h1 style="font-size: 42px; font-weight: 700; color: #111827; line-height: 1.2; margin-bottom: 24px;">
          ${project.title}
        </h1>
        <p style="font-size: 14px; color: #9ca3af; font-style: italic; margin-bottom: 48px;">
          ${project.briefing?.target_audience || ''}
        </p>
        <div style="width: 48px; height: 2px; background: #111827; margin-bottom: 48px;"></div>
        <p style="font-size: 12px; color: #9ca3af; font-family: 'Arial', sans-serif;">${now}</p>
      </div>

      <!-- Table of Contents -->
      ${chapters.length > 0 ? `
      <div style="page-break-after: always; padding: 48px 0;">
        <h2 style="font-size: 20px; font-weight: 700; color: #111; letter-spacing: 2px; text-transform: uppercase; margin-bottom: 32px; font-family: 'Arial', sans-serif;">
          Sumário
        </h2>
        <ol style="list-style: none; padding: 0; margin: 0;">
          ${chapters.map((ch, i) => `
            <li style="display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px dotted #e5e7eb; font-size: 14px; color: #374151;">
              <span>${i + 1}. ${ch.title}</span>
            </li>
          `).join('')}
        </ol>
      </div>
      ` : ''}

      <!-- Chapters -->
      ${chaptersHtml}
    </div>
  `;

  const element = document.createElement('div');
  element.innerHTML = fullHtml;
  document.body.appendChild(element);

  try {
    await html2pdf()
      .set({
        margin: [20, 20, 20, 20],
        filename: `${project.title.replace(/[^a-zA-Z0-9\s]/g, '').trim()}.pdf`,
        html2canvas: { scale: 2, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      })
      .from(element)
      .save();
  } finally {
    document.body.removeChild(element);
  }
}
