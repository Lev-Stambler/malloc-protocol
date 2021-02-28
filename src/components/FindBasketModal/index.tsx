import React, { useCallback, useState } from "react";
import { useMalloc } from '../../contexts/malloc';
import { Modal, Form, AutoComplete, Button } from 'antd';
import { CreateBasketModal } from '../CreateBasketModal';
import {BasketNode} from "../../models/malloc";

export interface FindBasketModalProps {
  isVisible: boolean,
  onCancel: () => void,
  onOk: (node: BasketNode) => void
}

export function FindBasketModal(props: FindBasketModalProps) { 
  const malloc = useMalloc();
  const [createBasketVisible, setCreateBasketVisible] = useState(false);
  const { isVisible, onCancel, onOk } = props;

  const openCreateBasket = () => {
    setCreateBasketVisible(true);
  }

  const closeCreateBasket = () => {
    setCreateBasketVisible(false);
  }

  const onSubmit = useCallback((basketName: string) => {
    const node = malloc.getCallGraph(basketName);
    onOk(node);
  }, [malloc, onOk])

  return (
    <Modal title="Find Basket" visible={isVisible} onCancel={onCancel}>
      <CreateBasketModal isVisible={createBasketVisible} onOk={closeCreateBasket} onCancel={closeCreateBasket}/>
      <Form name="find-basket" onFinish={onSubmit} >
        <Form.Item name={'name'} label="Search Baskets" rules={[{ required: true }]}>
          <AutoComplete/>
        </Form.Item>
        <Form.Item>
          <div className="flex flex-row w-full justify-end">
            <Button className="mr-2" type="primary" htmlType="submit">
              Add Node
            </Button>
            <Button type="default" onClick={openCreateBasket}>
              Create New Basket
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  )
}

