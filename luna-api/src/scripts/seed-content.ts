import { randomUUID } from 'node:crypto';
import { richTextFromPlain, Site } from '@luna/shared';

/** El contenido que hoy está fijo en luna-portafolio, pasado al modelo de secciones. */
export function currentPortfolioContent(): Site {
  return Site.parse({
    settings: {
      name: 'Luna Kuyen',
      seo: {
        title: 'Luna Kuyen | Artista Escénica',
        description:
          'Luna Kuyen - Artista Escénica. Bailarina, actriz y performer con experiencia en teatro, danza contemporánea y artes escénicas.',
        ogImageId: null,
      },
      contact: {
        email: 'lunakuyenjofre@gmail.com',
        phone: '2625403786',
        location: 'Mendoza, Argentina',
      },
      socials: [
        { network: 'instagram', url: 'https://www.instagram.com/lunakuyenn' },
        { network: 'youtube', url: 'https://www.youtube.com/@lunakuyenn' },
      ],
      footerText: 'Luna Kuyen. Todos los derechos reservados.',
    },
    sections: [
      {
        id: randomUUID(),
        type: 'hero',
        anchor: 'inicio',
        navLabel: 'Inicio',
        showInNav: true,
        visible: true,
        variant: 'plain',
        props: {
          eyebrow: 'Artista Escénica',
          title: 'Luna',
          highlight: 'Kuyen',
          subtitle: 'Teatro • Danza • Performance',
          buttons: [
            { label: 'Descubrir', href: '#biografia' },
            { label: 'Contacto', href: '#contacto' },
          ],
          backgroundImageId: null,
        },
      },
      {
        id: randomUUID(),
        type: 'biography',
        anchor: 'biografia',
        navLabel: 'Biografía',
        showInNav: true,
        visible: true,
        variant: 'plain',
        props: {
          title: 'Biografía',
          body: richTextFromPlain(
            [
              'Artista escénica apasionada por crear experiencias únicas que conectan con el público desde la emoción y la sorpresa. Su formación en danzas variadas, teatro físico, clown, pantomima, circo y maquillaje artístico la ha convertido en una intérprete versátil capaz de adaptarse a cualquier proyecto: desde intervenciones con fuego que iluminan eventos corporativos, fiestas y shows musicales, hasta personajes cautivadores para eventos escolares, celebraciones privadas y propuestas escénicas experimentales. Además, ha desempeñado su rol docente tanto en danzas como en teatro, generando espacios pedagógico-didácticos que se adaptan a cualquier sujeto de aprendizaje.',
              'Su perspectiva se basa en impulsar un arte versátil que posibilite la fusión con diversas disciplinas y formatos, con el objetivo de generar comunidad, trabajar en equipo y enriquecer propuestas.',
              'El compromiso, la disposición y el ideal de generar momentos memorables le permiten llevar magia y profesionalismo a cada proyecto, superar expectativas y crear conexiones genuinas con cada audiencia.',
            ].join('\n\n'),
          ),
          // La foto actual es /bio.jpg del portafolio; pasa a la biblioteca en la fase 2.
          imageId: null,
          imageAlt: 'Luna Kuyen - Retrato',
          imageSide: 'left',
        },
      },
      {
        id: randomUUID(),
        type: 'gallery',
        anchor: 'material',
        navLabel: 'Material',
        showInNav: true,
        visible: true,
        variant: 'card',
        props: { eyebrow: 'Portfolio', title: 'Material', collectionIds: [], showTypeFilter: true },
      },
      {
        id: randomUUID(),
        type: 'contact',
        anchor: 'contacto',
        navLabel: 'Contacto',
        showInNav: true,
        visible: true,
        variant: 'card',
        props: {
          eyebrow: 'Hablemos',
          title: 'Contacto',
          intro:
            '¿Tienes un proyecto en mente? Me encantaría escuchar tus ideas y explorar nuevas oportunidades de colaboración.',
          showForm: true,
        },
      },
    ],
  });
}
