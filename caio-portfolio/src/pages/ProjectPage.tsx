import { useNavigate, useParams } from 'react-router-dom'
import OmniControlPanel from '../components/OmniControlPanel'
import DepthPanel from '../components/DepthPanel'
import NexusPanel from '../components/NexusPanel'
import KinesisPanel from '../components/KinesisPanel'
import CustomCursor from '../components/CustomCursor'

export default function ProjectPage() {
  const { slug } = useParams<{ slug: string }>()
  const navigate = useNavigate()

  const onClose = () => {
    sessionStorage.setItem('skipIntro', 'true')
    navigate('/')
  }
  const onProjectClick = (id: string) => navigate(`/${id}`)

  let panel = null
  if (slug === 'omnicontrol') {
    panel = <OmniControlPanel open onClose={onClose} onProjectClick={onProjectClick} />
  } else if (slug === 'depth') {
    panel = <DepthPanel open onClose={onClose} onProjectClick={onProjectClick} />
  } else if (slug === 'nexus') {
    panel = <NexusPanel open onClose={onClose} onProjectClick={onProjectClick} />
  } else if (slug === 'kinesis') {
    panel = <KinesisPanel open onClose={onClose} onProjectClick={onProjectClick} />
  } else {
    navigate('/', { replace: true })
    return null
  }

  return (
    <>
      {panel}
      <CustomCursor />
    </>
  )
}
