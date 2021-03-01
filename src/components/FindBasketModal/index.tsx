import React, { useCallback, useState, useMemo } from "react";
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
  
  const getSearchOptions = useCallback(() => {
    return malloc.getBasketNames();
  }, [malloc])

  const searchOptions = useMemo(() => getSearchOptions().map(value => ({ value })), [getSearchOptions]);

  return (
    <Modal title="Find Basket" visible={isVisible} footer={null} closable={false}>
      <CreateBasketModal isVisible={createBasketVisible} onOk={closeCreateBasket} onCancel={closeCreateBasket}/>
      <Form name="find-basket" onFinish={({ name }) => onSubmit(name)} >
        <Form.Item name={'name'} label="Search Baskets" rules={[{ required: true }]}>
          <AutoComplete
            options={searchOptions}
            filterOption={(inputValue, option) => (
              option!.value.toUpperCase().indexOf(inputValue.toUpperCase()) !== -1
            )}
          />
        </Form.Item>
        <Form.Item>
          <div className="flex flex-row w-full justify-end">
            <div className="flex-grow justiy-start">
              <Button type="default" onClick={onCancel}>
                Cancel
              </Button>
            </div>
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

